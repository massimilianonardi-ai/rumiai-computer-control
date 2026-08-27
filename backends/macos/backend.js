"use strict";
const controls = require("./backend-controls");
const lifecycle = require("./application-lifecycle");
const dialogObservation = require("./runtime/app/computer-control/backends/macos-dialog-observation");
const dialogAction = require("./runtime/app/computer-control/backends/macos-dialog-semantic-action");
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

function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
function dialogContext(application,method){
  const entry=lifecycle.resolveProvider(application);
  const observed=lifecycle.observeResolved(entry);
  if(!observed.running) throw new ComputerControlError("APP_NOT_RUNNING",`Application "${entry.provider.name}" is not running; ${method} does not launch implicitly`,"NONE",{state:"FAILED"});
  if(observed.processes.length!==1) throw new ComputerControlError("DIALOG_TARGET_PID_AMBIGUOUS",`${method} requires exactly one running process for "${entry.provider.name}"; observed ${observed.processes.length}`,"NONE",{state:"FAILED"});
  return {entry,observed,pid:observed.processes[0].pid};
}
function observeDialogs(pid){
  const native=dialogObservation.observe({pid});
  if(!native?.ok) throw new ComputerControlError(native?.error||"DIALOG_OBSERVATION_FAILED",native?.detail||"Could not observe native dialogs","NONE",{state:native?.state||"FAILED",method:native?.method});
  return native;
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
      return {...info, capabilities:[...promoted, ...PHASE9A1.filter(capability => !names.has(capability.name)), ...PHASE9A2.filter(capability => !names.has(capability.name)), ...PHASE9B1.filter(capability => !names.has(capability.name)), ...PHASE9B2.filter(capability => !names.has(capability.name))]};
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

module.exports = {...controls, createMacOSBackend, canonicalDialog, dialogContext, observeDialogs};
