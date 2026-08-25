"use strict";

const os = require("node:os");
const {ComputerControlError} = require("./errors");

const CONTRACT_VERSION = "0.3.0";
const RUNTIME_VERSION = "0.3.0";

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
        return backend.ensureRuntime();

      case "runtime.shutdown":
        return backend.shutdown();

      case "ui.setText":
        validateSetTextParams(params);
        return backend.setText(params);

      case "ui.snapshot":
        validateSnapshotParams(params);
        return backend.snapshot(params);

      case "ui.find":
        validateFindParams(params);
        return backend.find(params);

      case "application.ensureReady":
        validateApplicationParams(params, "application.ensureReady");
        return backend.ensureApplicationReady(params);

      case "application.getForeground":
        return backend.getForeground();

      case "ui.get":
        validateElementParams(params, "ui.get");
        if (!String(params.property || "").trim()) {
          throw new ComputerControlError("PROPERTY_REQUIRED", "ui.get requires property", "NONE");
        }
        return backend.get(params);

      case "ui.getBounds":
        validateElementParams(params, "ui.getBounds");
        return backend.getBounds(params);

      default:
        throw new ComputerControlError(
          "METHOD_NOT_FOUND",
          `Unsupported Computer Control method: ${method}`,
          "NONE"
        );
    }
  };
}

function validateApplicationParams(params, method) {
  if (!params || typeof params !== "object" || Array.isArray(params)) {
    throw new ComputerControlError("INVALID_PARAMS", `${method} requires an object`, "NONE");
  }
  if (!String(params.application || "").trim()) {
    throw new ComputerControlError("APP_REQUIRED", `${method} requires application`, "NONE");
  }
}

function validateElementParams(params, method) {
  validateApplicationParams(params, method);
  if (!/^@e\d+$/.test(String(params.target?.ref || ""))) {
    throw new ComputerControlError("ACTIONABLE_ELEMENT_REQUIRED", `${method} requires an @e target`, "NONE");
  }
}

function validateSnapshotParams(params) {
  if (!params || typeof params !== "object" || Array.isArray(params)) {
    throw new ComputerControlError("INVALID_PARAMS", "ui.snapshot requires an object", "NONE");
  }
  if (!String(params.application || "").trim()) {
    throw new ComputerControlError("APP_REQUIRED", "ui.snapshot requires application", "NONE");
  }
}

function validateFindParams(params) {
  if (!params || typeof params !== "object" || Array.isArray(params)) {
    throw new ComputerControlError("INVALID_PARAMS", "ui.find requires an object", "NONE");
  }
  if (!String(params.application || "").trim()) {
    throw new ComputerControlError("APP_REQUIRED", "ui.find requires application", "NONE");
  }
  const query = String(params.query || "").trim();
  const role = String(params.role || "").trim();
  if (!query && !role) {
    throw new ComputerControlError("QUERY_OR_ROLE_REQUIRED", "ui.find requires query or role", "NONE");
  }
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

module.exports = {
  createRouter,
  validateSetTextParams,
  validateSnapshotParams,
  validateFindParams,
  validateApplicationParams,
  validateElementParams,
  CONTRACT_VERSION,
  RUNTIME_VERSION,
};
