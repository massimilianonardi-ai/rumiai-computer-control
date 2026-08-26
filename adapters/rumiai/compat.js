"use strict";

const path = require("node:path");
const {spawnSync} = require("node:child_process");
const core = require("./compat-core");

const ROOT = path.resolve(__dirname, "../..");
const SOCKET = process.env.RUMIAI_CC_SOCKET || "/tmp/rumiai-computer-control-rumiai.sock";
const NODE = process.env.RUMIAI_CC_NODE || process.execPath;
const SYNC_CALL = path.join(ROOT, "sdk", "typescript", "src", "sync-call.js");

function extensionCall(method, params) {
  const ready = core.ensureRuntime();
  if (!ready?.ok) return ready;
  const executed = spawnSync(NODE, [SYNC_CALL], {
    cwd:ROOT,
    input:JSON.stringify({socketPath:SOCKET, method, params, timeoutMs:30000}),
    encoding:"utf8",
    maxBuffer:32 * 1024 * 1024,
  });
  let envelope;
  try { envelope = JSON.parse(executed.stdout || "{}"); }
  catch (error) {
    return {ok:false, state:"FAILED", error:"RESPONSE_DECODE_FAILED", detail:error.message, recoveryPolicy:"NONE"};
  }
  if (!envelope.ok) {
    return {
      ok:false,
      state:envelope.error?.details?.state || "FAILED",
      error:envelope.error?.code || "CLIENT_CALL_FAILED",
      detail:envelope.error?.message || executed.stderr || "Computer Control call failed",
      recoveryPolicy:envelope.error?.recoveryPolicy || "NONE",
      diagnostics:envelope.error?.details || {},
    };
  }
  const value = envelope.result;
  return {
    ...value,
    method:value.backend?.strategy,
    verificationMethod:value.verification?.method,
    fallbackUsed:value.backend?.fallback === true,
    actionSeconds:value.diagnostics?.actionSeconds || 0,
    observeSeconds:value.diagnostics?.observeSeconds || 0,
  };
}

function toggle({app, element, value, settle = true}) {
  return extensionCall("ui.toggle", {application:app, target:element, value:Boolean(value), settle});
}

function select({app, element, settle = true}) {
  return extensionCall("ui.select", {application:app, target:element, settle});
}

module.exports = {...core, toggle, select};
