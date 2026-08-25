"use strict";

const os = require("node:os");
const {ComputerControlError} = require("./errors");

const CONTRACT_VERSION = "0.1.0";
const RUNTIME_VERSION = "0.1.0";

function createRouter(backend) {
  if (!backend || typeof backend.info !== "function") {
    throw new TypeError("A Computer Control backend is required");
  }

  return async function route(method, params = {}) {
    switch (method) {
      case "runtime.info": {
        const backendInfo = await backend.info();
        return {
          contractVersion:CONTRACT_VERSION,
          runtimeVersion:RUNTIME_VERSION,
          backend:{name:backendInfo.name, version:backendInfo.version},
          platform:{
            os:backendInfo.platform,
            version:os.release(),
            architecture:os.arch(),
          },
          capabilities:backendInfo.capabilities,
        };
      }

      case "runtime.ensureReady":
        return backend.ensureReady();

      case "runtime.shutdown":
        return backend.shutdown();

      case "ui.setText":
        validateSetTextParams(params);
        return backend.setText(params);

      default:
        throw new ComputerControlError(
          "METHOD_NOT_FOUND",
          `Unsupported Computer Control method: ${method}`,
          "NONE"
        );
    }
  };
}

function validateSetTextParams(params) {
  if (!params || typeof params !== "object" || Array.isArray(params)) {
    throw new ComputerControlError("INVALID_PARAMS", "ui.setText requires an object", "NONE");
  }
  if (!String(params.application || "").trim()) {
    throw new ComputerControlError("APP_REQUIRED", "ui.setText requires application", "NONE");
  }
  if (!/^@e\d+$/.test(String(params.target?.ref || ""))) {
    throw new ComputerControlError(
      "EDITABLE_ELEMENT_REQUIRED",
      "ui.setText requires an actionable @e target reference",
      "NONE"
    );
  }
  if (typeof params.text !== "string" || params.text.length === 0) {
    throw new ComputerControlError(
      "EMPTY_TEXT_REQUIRES_CLEAR",
      "ui.setText does not encode clear semantics",
      "NONE"
    );
  }
}

module.exports = {createRouter, validateSetTextParams, CONTRACT_VERSION, RUNTIME_VERSION};
