"use strict";

const path = require("node:path");
const core = require("./backend-core");
const {ComputerControlError} = require("../../runtime/src/errors");

const EXTENSION_CAPABILITIES = [
  ["ui.toggle", ["accessibility-state-observation", "ax-action", "postcondition-reobservation"]],
  ["ui.select", ["accessibility-state-observation", "ax-action", "postcondition-reobservation"]],
  ["ui.expand", ["accessibility-expanded-observation", "ax-action", "postcondition-reobservation"]],
  ["ui.collapse", ["accessibility-expanded-observation", "ax-action", "postcondition-reobservation"]],
];

function createMacOSBackend(options = {}) {
  const base = core.createMacOSBackend(options);
  let extensionControl = null;
  function control() {
    if (extensionControl) return extensionControl;
    if (options.backendModule) return (extensionControl = options.backendModule);
    return (extensionControl = require(path.resolve(options.modulePath || core.DEFAULT_MACOS_MODULE)));
  }
  return {
    ...base,
    async info() {
      const info = await base.info();
      const names = new Set(info.capabilities.map(item => item.name));
      const available = info.capabilities.some(item => item.available);
      const additions = EXTENSION_CAPABILITIES
        .filter(([name]) => !names.has(name))
        .map(([name, strategies]) => ({name, available, validationState:"IMPLEMENTED", strategies}));
      return {...info, capabilities:[...info.capabilities, ...additions]};
    },
    async toggle({application, target, value, settle = true}) {
      return mapStateful(control().toggle({app:application, element:target, value, settle:Boolean(settle)}), "TOGGLED", "TOGGLE_VERIFICATION_FAILED", target, {requestedValue:Boolean(value)});
    },
    async select({application, target, settle = true}) {
      return mapStateful(control().select({app:application, element:target, settle:Boolean(settle)}), "SELECTED", "SELECT_VERIFICATION_FAILED", target);
    },
    async expand({application, target, settle = true}) {
      return mapStateful(control().expand({app:application, element:target, settle:Boolean(settle)}), "EXPANDED", "EXPAND_VERIFICATION_FAILED", target);
    },
    async collapse({application, target, settle = true}) {
      return mapStateful(control().collapse({app:application, element:target, settle:Boolean(settle)}), "COLLAPSED", "COLLAPSE_VERIFICATION_FAILED", target);
    },
  };
}

function mapStateful(result, state, fallbackCode, target, extra = {}) {
  if (!result?.ok || result.verified !== true) throw backendFailure(result, fallbackCode);
  return {
    ok:true, state, verified:true,
    target:{ref:result.ref || target.ref, role:result.role, name:result.name || ""},
    ...extra,
    previousValue:result.previousValue,
    observedValue:result.observedValue,
    changed:result.changed === true,
    idempotent:result.idempotent === true,
    verification:{method:result.verificationMethod || "state-postcondition-observed", evidence:{previousValue:result.previousValue, observedValue:result.observedValue, idempotent:result.idempotent === true}},
    backend:{name:"macos-ax", strategy:result.method || "unknown", fallback:Boolean(result.fallbackUsed)},
    diagnostics:{actionSeconds:result.actionSeconds || 0, observeSeconds:result.observeSeconds || 0, totalSeconds:result.totalSeconds || 0},
  };
}

function backendFailure(result, fallbackCode) {
  return new ComputerControlError(result?.error || fallbackCode, result?.detail || fallbackCode, "NONE", {state:result?.state || "FAILED", method:result?.method || "none"});
}

module.exports = {...core, createMacOSBackend};
