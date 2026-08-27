"use strict";
const controls = require("./backend-controls");

const PHASE8C = new Set([
  "ui.replaceTextRange",
  "ui.insertText",
  "ui.appendText",
]);

function createMacOSBackend(options = {}) {
  const base = controls.createMacOSBackend(options);
  return {
    ...base,
    async info() {
      const info = await base.info();
      return {
        ...info,
        capabilities:info.capabilities.map(capability =>
          PHASE8C.has(capability.name)
            ? {...capability, validationState:"PHYSICALLY_VALIDATED"}
            : capability
        ),
      };
    },
  };
}

module.exports = {...controls, createMacOSBackend};
