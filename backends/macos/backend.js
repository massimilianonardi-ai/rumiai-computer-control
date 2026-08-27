"use strict";
const controls = require("./backend-controls");
const lifecycle = require("./application-lifecycle");
const dialogObservation = require("./runtime/app/computer-control/backends/macos-dialog-observation");
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
  {name:"dialog.list", available:true, validationState:"IMPLEMENTED", strategies:["provider-scoped-native-AX-dialog-observation"]},
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
      return {...info, capabilities:[...promoted, ...PHASE9A1.filter(capability => !names.has(capability.name)), ...PHASE9A2.filter(capability => !names.has(capability.name)), ...PHASE9B1.filter(capability => !names.has(capability.name))]};
    },
    async listApplications({availableOnly=false}={}) { return lifecycle.list({availableOnly}); },
    async launchApplication({application,timeoutMs}) { return lifecycle.launch({application,timeoutMs}); },
    async activateApplication({application,timeoutMs}) { return lifecycle.activate({application,timeoutMs}); },
    async terminateApplication({application,timeoutMs}) { return lifecycle.terminate({application,timeoutMs}); },
    async listDialogs({application}) {
      const entry=lifecycle.resolveProvider(application);
      const observed=lifecycle.observeResolved(entry);
      if(!observed.running) throw new ComputerControlError("APP_NOT_RUNNING",`Application "${entry.provider.name}" is not running; dialog.list does not launch implicitly`,"NONE",{state:"FAILED"});
      if(observed.processes.length!==1) throw new ComputerControlError("DIALOG_TARGET_PID_AMBIGUOUS",`Dialog observation requires exactly one running process for "${entry.provider.name}"; observed ${observed.processes.length}`,"NONE",{state:"FAILED"});
      const native=dialogObservation.observe({pid:observed.processes[0].pid});
      if(!native?.ok) throw new ComputerControlError(native?.error||"DIALOG_OBSERVATION_FAILED",native?.detail||`Could not observe dialogs for "${entry.provider.name}"`,"NONE",{state:native?.state||"FAILED",method:native?.method});
      return {
        state:"OBSERVED",
        application:lifecycle.publicDescriptor(entry,observed),
        dialogs:native.dialogs.map(canonicalDialog),
        observation:{method:native.method},
        backend:{name:"macos-ax",strategy:"provider-scoped-native-AX-dialog-observation"},
        diagnostics:{observeSeconds:native.seconds||0,helperCompiled:native.compiled===true},
      };
    },
  };
}

module.exports = {...controls, createMacOSBackend, canonicalDialog};
