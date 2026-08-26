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
    method:value.backend?.strategy || value.observation?.method,
    verificationMethod:value.verification?.method,
    fallbackUsed:value.backend?.fallback === true,
    actionSeconds:value.diagnostics?.actionSeconds || 0,
    observeSeconds:value.diagnostics?.observeSeconds || 0,
  };
}

function safe(method, params, map = value => value) {
  const value = extensionCall(method, params);
  if (value?.ok === false) return value;
  return map(value);
}

function describe({app, element}) {
  return safe("ui.describe", {application:app, target:element}, value => ({
    ok:true,
    ...value,
    ref:value.target.ref,
    role:value.target.role,
    name:value.target.name,
    method:value.observation?.method || value.method,
  }));
}

function action(method, {app, element, settle = true}) {
  return safe(method, {application:app, target:element, settle}, value => ({
    ...value,
    method:value.backend?.strategy || value.method,
    verificationMethod:value.verification?.method || value.verificationMethod,
    fallbackUsed:value.backend?.fallback === true || value.fallbackUsed === true,
    actionSeconds:value.diagnostics?.actionSeconds || value.actionSeconds || 0,
    observeSeconds:value.diagnostics?.observeSeconds || value.observeSeconds || 0,
  }));
}

const invoke = params => action("ui.invoke", params);

function toggle({app, element, value, settle = true}) {
  return extensionCall("ui.toggle", {application:app, target:element, value:Boolean(value), settle});
}

function select({app, element, settle = true}) {
  return extensionCall("ui.select", {application:app, target:element, settle});
}

module.exports = {...core, describe, invoke, toggle, select};
