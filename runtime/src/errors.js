"use strict";

class ComputerControlError extends Error {
  constructor(code, message, recoveryPolicy = "NONE", details = {}) {
    super(message);
    this.name = "ComputerControlError";
    this.code = code;
    this.recoveryPolicy = recoveryPolicy;
    this.details = details;
  }
}

function errorData(error) {
  if (error instanceof ComputerControlError) {
    return {
      code:error.code,
      message:error.message,
      recoveryPolicy:error.recoveryPolicy,
      details:error.details,
    };
  }

  return {
    code:"INTERNAL_ERROR",
    message:"Computer Control encountered an internal error",
    recoveryPolicy:"NONE",
    details:{},
  };
}

module.exports = {ComputerControlError, errorData};
