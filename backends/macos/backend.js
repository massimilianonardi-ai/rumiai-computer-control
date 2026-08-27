"use strict";
const controls = require("./backend-controls");
const lifecycle = require("./application-lifecycle");
const dialogObservation = require("./runtime/app/computer-control/backends/macos-dialog-observation");
const dialogAction = require("./runtime/app/computer-control/backends/macos-dialog-semantic-action");
const filePickerObservation = require("./runtime/app/computer-control/backends/macos-file-picker-observation");
const filePickerItemAction = require("./runtime/app/computer-control/backends/macos-file-picker-item-action");
const {ComputerControlError} = require("../../runtime/src/errors");

const PHASE8C = new Set([
  "ui.replaceTextRange",
  "ui.insertText",
  "ui.appendText",
]);

const PHASE9A1 = [
  {name:"application.list", available:true, validationState:"PHYSICALLY_VALIDATED", strategies:["provider-scoped-application-inventory","process-and-foreground-observation"]},
  {name:"application.launch", available:true, validationState:"PHYSICALLY_VALIDATED", strategies:["desktop-plugin-launch","process-postcondition"]},
  {name:"application.activate", available:true, validationState:"PHYSICALLY_VALIDATED", strategies:["desktop-plugin-activate","foreground-postcondition"]},
];

const PHASE9A2 = [
  {name:"application.terminate", available:true, validationState:"PHYSICALLY_VALIDATED", strategies:["provider-scoped-graceful-termination","process-not-running-postcondition"]},
];

const PHASE9B1 = [
  {name:"dialog.list", available:true, validationState:"PHYSICALLY_VALIDATED", strategies:["provider-scoped-native-AX-dialog-observation"]},
];

const PHASE9B2 = [
  {name:"dialog.invokeDefault", available:true, validationState:"PHYSICALLY_VALIDATED", strategies:["provider-scoped-native-AX-default-button","dialog-absence-postcondition"]},
  {name:"dialog.invokeCancel", available:true, validationState:"PHYSICALLY_VALIDATED", strategies:["provider-scoped-native-AX-cancel-button","dialog-absence-postcondition"]},
];

const PHASE9B3A = [
  {name:"filePicker.observe", available:true, validationState:"PHYSICALLY_VALIDATED", strategies:["provider-scoped-native-AX-file-picker-observation"]},
];

const PHASE9B3B = [
  {name:"filePicker.selectItem", available:true, validationState:"IMPLEMENTED", strategies:["provider-scoped-native-AX-pick","selected-item-postcondition"]},
  {name:"filePicker.openDirectory", available:true, validationState:"IMPLEMENTED", strategies:["provider-scoped-native-AX-confirm","location-change-postcondition"]},
];

function canonicalDialog(value={}) {
  return {
    kind:value.kind === "sheet" ? "sheet" : "dialog",
    title:value.title == null ? null : String(value.title),
    texts:Array.isArray(value.texts) ? value.texts.map(String) : [],
    modal:typeof value.modal === "boolean" ? value.modal : null,
    buttons:Array.isArray(value.buttons) ? value.buttons.map(button => ({
      label:button?.label == null ? null : String(button.label),
      enabled:typeof button?.enabled === "boolean" ? button.enabled : null,
    })) : [],
  };
}

function canonicalFilePickerItem(value={}) {
  return {
    name:String(value.name||""),
    kind:value.kind === "directory" ? "directory" : value.kind === "file" ? "file" : "unknown",
    selected:typeof value.selected === "boolean" ? value.selected : null,
    enabled:typeof value.enabled === "boolean" ? value.enabled : null,
  };
}

function canonicalFilePicker(value={}) {
  return {
    kind:"open",
    location:value.location == null ? null : String(value.location),
    items:Array.isArray(value.items) ? value.items.map(canonicalFilePickerItem).filter(item=>item.name.length>0) : [],
  };
}

function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
function dialogContext(application,method){
  const entry=lifecycle.resolveProvider(application);
  const observed=lifecycle.observeResolved(entry);
  if(!observed.running) throw new ComputerControlError("APP_NOT_RUNNING",`Application "${entry.provider.name}" is not running; ${method} does not launch implicitly`,"NONE",{state:"FAILED"});
  if(observed.processes.length!==1) throw new ComputerControlError("DIALOG_TARGET_PID_AMBIGUOUS",`${method} requires exactly one running process for "${entry.provider.name}"; observed ${observed.processes.length}`,"NONE",{state:"FAILED"});
  return {entry,observed,pid:observed.processes[0].pid};
}
function filePickerContext(application,method){
  const entry=lifecycle.resolveProvider(application);
  const observed=lifecycle.observeResolved(entry);
  if(!observed.running) throw new ComputerControlError("APP_NOT_RUNNING",`Application "${entry.provider.name}" is not running; ${method} does not launch implicitly`,"NONE",{state:"FAILED"});
  if(observed.processes.length!==1) throw new ComputerControlError("FILE_PICKER_TARGET_PID_AMBIGUOUS",`${method} requires exactly one running process for "${entry.provider.name}"; observed ${observed.processes.length}`,"NONE",{state:"FAILED"});
  return {entry,observed,pid:observed.processes[0].pid};
}
function observeDialogs(pid){
  const native=dialogObservation.observe({pid});
  if(!native?.ok) throw new ComputerControlError(native?.error||"DIALOG_OBSERVATION_FAILED",native?.detail||"Could not observe native dialogs","NONE",{state:native?.state||"FAILED",method:native?.method});
  return native;
}
function observeFilePicker(pid,method="filePicker.observe"){
  const native=filePickerObservation.observe({pid});
  if(!native?.ok) throw new ComputerControlError(native?.error||"FILE_PICKER_OBSERVATION_FAILED",native?.detail||"Could not observe native file picker","NONE",{state:native?.state||"FAILED",method:native?.method});
  if(native.pickers.length>1) throw new ComputerControlError("FILE_PICKER_AMBIGUOUS",`${method} requires at most one native file picker; observed ${native.pickers.length}`,"NONE",{state:"FAILED",method:native.method});
  return native;
}
function requireFilePicker(native,method){
  if(native.pickers.length===0) throw new ComputerControlError("FILE_PICKER_NOT_FOUND",`${method} requires one open native file picker`,"NONE",{state:"FAILED",method:native.method});
  return canonicalFilePicker(native.pickers[0]);
}
function exactFilePickerItem(picker,name,method){
  const matches=picker.items.filter(item=>item.name===name);
  if(matches.length===0) throw new ComputerControlError("FILE_PICKER_ITEM_NOT_FOUND",`${method} could not find visible item "${name}"`,"NONE",{state:"FAILED"});
  if(matches.length!==1) throw new ComputerControlError("FILE_PICKER_ITEM_AMBIGUOUS",`${method} requires exactly one visible item named "${name}"; observed ${matches.length}`,"NONE",{state:"FAILED"});
  return matches[0];
}
function deliverFilePickerItemAction(pid,action,name,method){
  const delivered=filePickerItemAction.perform({pid,action,name});
  if(!delivered?.ok) throw new ComputerControlError(delivered?.error||"FILE_PICKER_ACTION_FAILED",delivered?.detail||`${method} native item action failed`,"NONE",{state:delivered?.state||"FAILED",method:delivered?.method});
  return delivered;
}

function createMacOSBackend(options = {}) {
  const base = controls.createMacOSBackend(options);
  return {
    ...base,
    async info() {
      const info = await base.info();
      const promoted = info.capabilities.map(capability =>
        PHASE8C.has(capability.name)
          ? {...capability, validationState:"PHYSICALLY_VALIDATED"}
          : capability
      );
      const names = new Set(promoted.map(capability => capability.name));
      return {...info, capabilities:[...promoted, ...PHASE9A1.filter(capability => !names.has(capability.name)), ...PHASE9A2.filter(capability => !names.has(capability.name)), ...PHASE9B1.filter(capability => !names.has(capability.name)), ...PHASE9B2.filter(capability => !names.has(capability.name)), ...PHASE9B3A.filter(capability => !names.has(capability.name)), ...PHASE9B3B.filter(capability => !names.has(capability.name))]};
    },
    async listApplications({availableOnly=false}={}) { return lifecycle.list({availableOnly}); },
    async launchApplication({application,timeoutMs}) { return lifecycle.launch({application,timeoutMs}); },
    async activateApplication({application,timeoutMs}) { return lifecycle.activate({application,timeoutMs}); },
    async terminateApplication({application,timeoutMs}) { return lifecycle.terminate({application,timeoutMs}); },
    async listDialogs({application}) {
      const {entry,observed,pid}=dialogContext(application,"dialog.list");
      const native=observeDialogs(pid);
      return {
        state:"OBSERVED",
        application:lifecycle.publicDescriptor(entry,observed),
        dialogs:native.dialogs.map(canonicalDialog),
        observation:{method:native.method},
        backend:{name:"macos-ax",strategy:"provider-scoped-native-AX-dialog-observation"},
        diagnostics:{observeSeconds:native.seconds||0,helperCompiled:native.compiled===true},
      };
    },
    async observeFilePicker({application}) {
      const {entry,observed,pid}=filePickerContext(application,"filePicker.observe");
      const native=observeFilePicker(pid);
      return {
        state:"OBSERVED",
        application:lifecycle.publicDescriptor(entry,observed),
        picker:native.pickers.length===1 ? canonicalFilePicker(native.pickers[0]) : null,
        observation:{method:native.method},
        backend:{name:"macos-ax",strategy:"provider-scoped-native-AX-file-picker-observation"},
        diagnostics:{observeSeconds:native.seconds||0,helperCompiled:native.compiled===true},
      };
    },
    async selectFilePickerItem({application,name,timeoutMs=3000}) {
      const method="filePicker.selectItem";
      const {entry,observed,pid}=filePickerContext(application,method);
      const beforeNative=observeFilePicker(pid,method);
      const before=requireFilePicker(beforeNative,method);
      const target=exactFilePickerItem(before,name,method);
      if(target.enabled===false) throw new ComputerControlError("FILE_PICKER_ITEM_DISABLED",`${method} cannot select disabled item "${name}"`,"NONE",{state:"FAILED"});
      if(target.selected===true){
        return {state:"FILE_PICKER_ITEM_SELECTED",application:lifecycle.publicDescriptor(entry,observed),item:target,location:before.location,changed:false,idempotent:true,verified:true,verification:{method:"native-file-picker-selected-item-observation",evidence:{name,selected:true}},backend:{name:"macos-ax",strategy:"provider-scoped-native-AX-pick",fallback:false},diagnostics:{actionSeconds:0,observeSeconds:beforeNative.seconds||0,helperCompiled:beforeNative.compiled===true}};
      }
      const delivered=deliverFilePickerItemAction(pid,"select",name,method);
      const deadline=Date.now()+timeoutMs;
      while(Date.now()<=deadline){
        const afterNative=observeFilePicker(pid,method);
        const after=requireFilePicker(afterNative,method);
        const observedItem=exactFilePickerItem(after,name,method);
        if(observedItem.selected===true){
          return {state:"FILE_PICKER_ITEM_SELECTED",application:lifecycle.publicDescriptor(entry,lifecycle.observeResolved(entry)),item:observedItem,location:after.location,changed:true,idempotent:false,verified:true,verification:{method:"native-file-picker-selected-item-observation",evidence:{name,selected:true}},backend:{name:"macos-ax",strategy:"provider-scoped-native-AX-pick",fallback:false},diagnostics:{actionSeconds:delivered.seconds||0,observeSeconds:(beforeNative.seconds||0)+(afterNative.seconds||0),helperCompiled:delivered.compiled===true||afterNative.compiled===true}};
        }
        await sleep(50);
      }
      throw new ComputerControlError("FILE_PICKER_SELECTION_POSTCONDITION_UNVERIFIED",`${method} was delivered but item "${name}" was not observed selected`,"NONE",{state:"FAILED",method:delivered.method});
    },
    async openFilePickerDirectory({application,name,timeoutMs=3000}) {
      const method="filePicker.openDirectory";
      const {entry,pid}=filePickerContext(application,method);
      const beforeNative=observeFilePicker(pid,method);
      const before=requireFilePicker(beforeNative,method);
      const target=exactFilePickerItem(before,name,method);
      if(target.enabled===false) throw new ComputerControlError("FILE_PICKER_ITEM_DISABLED",`${method} cannot open disabled item "${name}"`,"NONE",{state:"FAILED"});
      if(target.kind!=="directory") throw new ComputerControlError("FILE_PICKER_ITEM_NOT_DIRECTORY",`${method} requires a visible directory; "${name}" is ${target.kind}`,"NONE",{state:"FAILED"});
      if(before.location==null) throw new ComputerControlError("FILE_PICKER_LOCATION_UNAVAILABLE",`${method} requires an observed current location to verify navigation`,"NONE",{state:"FAILED"});
      const delivered=deliverFilePickerItemAction(pid,"open-directory",name,method);
      const deadline=Date.now()+timeoutMs;
      while(Date.now()<=deadline){
        const afterNative=observeFilePicker(pid,method);
        if(afterNative.pickers.length===0) throw new ComputerControlError("FILE_PICKER_NAVIGATION_PICKER_DISMISSED",`${method} dismissed the picker instead of navigating`,"NONE",{state:"FAILED",method:delivered.method});
        const after=requireFilePicker(afterNative,method);
        if(after.location!=null&&after.location!==before.location){
          return {state:"FILE_PICKER_DIRECTORY_OPENED",application:lifecycle.publicDescriptor(entry,lifecycle.observeResolved(entry)),directory:{name,kind:"directory"},previousLocation:before.location,observedLocation:after.location,picker:after,changed:true,idempotent:false,verified:true,verification:{method:"native-file-picker-location-change-observation",evidence:{previousLocation:before.location,observedLocation:after.location}},backend:{name:"macos-ax",strategy:"provider-scoped-native-AX-confirm",fallback:false},diagnostics:{actionSeconds:delivered.seconds||0,observeSeconds:(beforeNative.seconds||0)+(afterNative.seconds||0),helperCompiled:delivered.compiled===true||afterNative.compiled===true}};
        }
        await sleep(50);
      }
      throw new ComputerControlError("FILE_PICKER_NAVIGATION_POSTCONDITION_UNVERIFIED",`${method} was delivered but the picker location did not change`,"NONE",{state:"FAILED",method:delivered.method});
    },
    async performDialogAction({application,action,timeoutMs=3000}) {
      const method=action==="cancel"?"dialog.invokeCancel":"dialog.invokeDefault";
      const {entry,observed,pid}=dialogContext(application,method);
      const before=observeDialogs(pid);
      if(before.dialogs.length===0) throw new ComputerControlError("DIALOG_NOT_FOUND",`${method} requires one observed native dialog`,"NONE",{state:"FAILED"});
      if(before.dialogs.length!==1) throw new ComputerControlError("DIALOG_TARGET_AMBIGUOUS",`${method} requires exactly one observed native dialog; observed ${before.dialogs.length}`,"NONE",{state:"FAILED"});
      const delivered=dialogAction.perform({pid,action});
      if(!delivered?.ok) throw new ComputerControlError(delivered?.error||"DIALOG_ACTION_FAILED",delivered?.detail||`${method} native semantic action failed`,"NONE",{state:delivered?.state||"FAILED",method:delivered?.method});
      const deadline=Date.now()+timeoutMs;
      let after=null;
      while(Date.now()<=deadline){
        const running=lifecycle.observeResolved(entry);
        if(!running.running) throw new ComputerControlError("DIALOG_ACTION_APP_EXITED",`${method} caused or coincided with application exit; ordinary dialog-action postcondition is not verified`,"NONE",{state:"FAILED"});
        after=observeDialogs(pid);
        if(after.dialogs.length===0){
          return {
            state:"DIALOG_ACTION_COMPLETED",
            action,
            application:lifecycle.publicDescriptor(entry,running),
            changed:true,
            idempotent:false,
            verified:true,
            verification:{method:"native-dialog-absent-after-semantic-action",evidence:{beforeCount:1,afterCount:0}},
            backend:{name:"macos-ax",strategy:action==="cancel"?"provider-scoped-native-AX-cancel-button":"provider-scoped-native-AX-default-button",fallback:false},
            diagnostics:{actionSeconds:delivered.seconds||0,observeSeconds:(before.seconds||0)+(after.seconds||0),helperCompiled:delivered.compiled===true||after.compiled===true},
          };
        }
        await sleep(50);
      }
      throw new ComputerControlError("DIALOG_ACTION_POSTCONDITION_UNVERIFIED",`${method} was delivered but the native dialog remained observable`,"NONE",{state:"FAILED",method:delivered.method});
    },
  };
}

module.exports = {...controls, createMacOSBackend, canonicalDialog, canonicalFilePickerItem, canonicalFilePicker, dialogContext, filePickerContext, observeDialogs, observeFilePicker, requireFilePicker, exactFilePickerItem};
