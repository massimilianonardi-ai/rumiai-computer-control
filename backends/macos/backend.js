"use strict";

const path = require("node:path");
const core = require("./backend-core");
const {ComputerControlError} = require("../../runtime/src/errors");

function createMacOSBackend(options = {}) {
  const base = core.createMacOSBackend(options);
  let extensionControl = null;

  function control() {
    if (extensionControl) return extensionControl;
    if (options.backendModule) {
      extensionControl = options.backendModule;
      return extensionControl;
    }
    extensionControl = require(path.resolve(options.modulePath || core.DEFAULT_MACOS_MODULE));
    return extensionControl;
  }

  return {
    ...base,

    async info() {
      const info = await base.info();
      const additions = [
        {
          name:"ui.toggle",
          available:info.capabilities.some(item => item.available),
          validationState:"IMPLEMENTED",
          strategies:["accessibility-state-observation", "ax-action", "postcondition-reobservation"],
        },
        {
          name:"ui.select",
          available:info.capabilities.some(item => item.available),
          validationState:"IMPLEMENTED",
          strategies:["accessibility-state-observation", "ax-action", "postcondition-reobservation"],
        },
      ];
      const names = new Set(info.capabilities.map(item => item.name));
      return {...info, capabilities:[...info.capabilities, ...additions.filter(item => !names.has(item.name))]};
    },

    async toggle({application, target, value, settle = true}) {
      const result = control().toggle({app:application, element:target, value, settle:Boolean(settle)});
      if (!result?.ok || result.verified !== true) {
        throw backendFailure(result, "TOGGLE_VERIFICATION_FAILED");
      }
      return statefulResult("TOGGLED", result, {
        target:{ref:result.ref || target.ref, role:result.role, name:result.name || ""},
        requestedValue:Boolean(value),
        previousValue:result.previousValue,
        observedValue:result.observedValue,
        changed:result.changed === true,
        idempotent:result.idempotent === true,
      });
    },

    async select({application, target, settle = true}) {
      const result = control().select({app:application, element:target, settle:Boolean(settle)});
      if (!result?.ok || result.verified !== true) {
        throw backendFailure(result, "SELECT_VERIFICATION_FAILED");
      }
      return statefulResult("SELECTED", result, {
        target:{ref:result.ref || target.ref, role:result.role, name:result.name || ""},
        previousValue:result.previousValue,
        observedValue:true,
        changed:result.changed === true,
        idempotent:result.idempotent === true,
      });
    },
  };
}

function statefulResult(state, result, extra) {
  return {
    ok:true,
    state,
    verified:true,
    ...extra,
    verification:{
      method:result.verificationMethod || "state-postcondition-observed",
      evidence:{
        previousValue:result.previousValue,
        observedValue:result.observedValue,
        idempotent:result.idempotent === true,
      },
    },
    backend:{
      name:"macos-ax",
      strategy:result.method || "unknown",
      fallback:Boolean(result.fallbackUsed),
    },
    diagnostics:{
      actionSeconds:result.actionSeconds || 0,
      observeSeconds:result.observeSeconds || 0,
      totalSeconds:result.totalSeconds || 0,
    },
  };
}

function backendFailure(result, fallbackCode) {
  return new ComputerControlError(
    result?.error || fallbackCode,
    result?.detail || fallbackCode,
    "NONE",
    {state:result?.state || "FAILED", method:result?.method || "none"}
  );
}

module.exports = {...core, createMacOSBackend};
