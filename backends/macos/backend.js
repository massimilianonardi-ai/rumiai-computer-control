"use strict";
const controls = require("./backend-controls");
const lifecycle = require("./application-lifecycle");

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
  {name:"application.terminate", available:true, validationState:"IMPLEMENTED", strategies:["provider-scoped-graceful-termination","process-not-running-postcondition"]},
];

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
      return {...info, capabilities:[...promoted, ...PHASE9A1.filter(capability => !names.has(capability.name)), ...PHASE9A2.filter(capability => !names.has(capability.name))]};
    },
    async listApplications({availableOnly=false}={}) { return lifecycle.list({availableOnly}); },
    async launchApplication({application,timeoutMs}) { return lifecycle.launch({application,timeoutMs}); },
    async activateApplication({application,timeoutMs}) { return lifecycle.activate({application,timeoutMs}); },
    async terminateApplication({application,timeoutMs}) { return lifecycle.terminate({application,timeoutMs}); },
  };
}

module.exports = {...controls, createMacOSBackend};
