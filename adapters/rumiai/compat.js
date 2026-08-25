"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {spawn, spawnSync} = require("node:child_process");

const ROOT = path.resolve(__dirname, "../..");
const SOCKET = process.env.RUMIAI_CC_SOCKET || "/tmp/rumiai-computer-control-rumiai.sock";
const NODE = process.env.RUMIAI_CC_NODE || process.execPath;
const RUNTIME = path.join(ROOT, "runtime", "src", "cli.js");
const SYNC_CALL = path.join(ROOT, "sdk", "typescript", "src", "sync-call.js");

let runtimeChild = null;

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function ensureProcess() {
  if (runtimeChild && runtimeChild.exitCode == null && fs.existsSync(SOCKET)) return;
  runtimeChild = spawn(NODE, [RUNTIME], {
    cwd:ROOT,
    env:{...process.env, RUMIAI_CC_SOCKET:SOCKET},
    stdio:"ignore",
  });
  const deadline = Date.now() + 10000;
  while (!fs.existsSync(SOCKET) && Date.now() < deadline) {
    if (runtimeChild.exitCode != null) throw new Error(`Computer Control runtime exited: ${runtimeChild.exitCode}`);
    sleep(25);
  }
  if (!fs.existsSync(SOCKET)) throw new Error("Computer Control runtime startup timeout");
}

function call(method, params = {}) {
  ensureProcess();
  const executed = spawnSync(NODE, [SYNC_CALL], {
    cwd:ROOT,
    input:JSON.stringify({socketPath:SOCKET, method, params, timeoutMs:30000}),
    encoding:"utf8",
    maxBuffer:32 * 1024 * 1024,
  });
  let envelope;
  try { envelope = JSON.parse(executed.stdout || "{}"); }
  catch (error) { throw new Error(`Computer Control response decode failed: ${error.message}`); }
  if (!envelope.ok) {
    const error = new Error(envelope.error?.message || executed.stderr || "Computer Control call failed");
    error.code = envelope.error?.code || "CLIENT_CALL_FAILED";
    error.recoveryPolicy = envelope.error?.recoveryPolicy || "NONE";
    error.details = envelope.error?.details || {};
    throw error;
  }
  return envelope.result;
}

function oldError(error) {
  return {ok:false, state:error.details?.state || "FAILED", error:error.code || "CLIENT_CALL_FAILED", detail:error.message, recoveryPolicy:error.recoveryPolicy || "NONE", diagnostics:error.details || {}};
}

function safe(method, params, map = value => value) {
  try { return map(call(method, params)); }
  catch (error) { return oldError(error); }
}

function runtimeInfo() {
  return safe("runtime.info", {}, value => ({id:value.backend.name, path:RUNTIME, available:true, contractVersion:value.contractVersion, runtimeVersion:value.runtimeVersion, capabilities:value.capabilities}));
}

function ensureRuntime() {
  return safe("runtime.ensureReady", {}, value => ({...value, backend:{id:value.backend.name}, method:value.backend.strategy}));
}

function shutdownRuntime() {
  const result = safe("runtime.shutdown", {}, value => ({...value, backend:{id:value.backend.name}, method:value.backend.strategy}));
  if (runtimeChild && runtimeChild.exitCode == null) runtimeChild.kill("SIGTERM");
  runtimeChild = null;
  return result;
}

function ensureReady(application, options = {}) {
  return safe("application.ensureReady", {application, timeoutMs:options.timeoutMs}, value => ({...value, currentApp:value.application.name, method:value.backend.strategy}));
}

function getForeground() {
  return safe("application.getForeground", {}, value => ({ok:true, state:value.state, ...value.application, method:value.observation.method}));
}

function snapshot({app, settle = false, compact = true, previousSnapshot = null}) {
  return safe("ui.snapshot", {application:app, settle, compact, previousSnapshot}, value => ({ok:true, state:value.state, snapshot:value.snapshot, changed:value.changed, method:value.observation.method, observeSeconds:value.diagnostics?.observeSeconds || 0}));
}

function find({app, query = "", role = null, first = true, snapshot = null}) {
  return safe("ui.find", {application:app, query, role, first, snapshot}, value => ({ok:true, state:"FOUND", query:value.query, role:value.role, ref:value.target.ref, refs:value.targets.map(target => target.ref), method:value.observation.method, source:value.source}));
}

function get({app, element, property}) {
  return safe("ui.get", {application:app, target:element, property}, value => ({ok:true, state:value.state, ref:value.target.ref, property:value.property, value:value.value, method:value.observation?.method}));
}

function getBounds({app, element}) {
  return safe("ui.getBounds", {application:app, target:element}, value => ({ok:true, state:value.state, ref:value.target.ref, bounds:{x:value.bounds.x, y:value.bounds.y, w:value.bounds.width, h:value.bounds.height}, method:value.observation?.method}));
}

function action(method, {app, element, keys, settle, text}) {
  const params = {application:app};
  if (element) params.target = element;
  if (keys) params.keys = keys;
  if (settle != null) params.settle = settle;
  if (text != null) params.text = text;
  return safe(method, params, value => ({
    ...value,
    method:value.backend?.strategy,
    verificationMethod:value.verification?.method,
    fallbackUsed:value.backend?.fallback === true || value.fallback === true,
    actionSeconds:value.diagnostics?.actionSeconds || 0,
    observeSeconds:value.diagnostics?.observeSeconds || 0,
  }));
}

const focus = params => action("ui.focus", params);
const click = params => action("ui.click", params);
const press = params => action("ui.press", params);
const setText = params => action("ui.setText", {...params, element:params.element, text:params.text});
const clear = params => action("ui.clear", params);

function waitStable({app, timeoutMs = 5000, pollMs = 200}) {
  return safe("sync.waitStable", {application:app, timeoutMs, pollMs}, value => ({ok:true, state:value.state, snapshot:value.snapshot, method:value.observation.method, waitSeconds:value.diagnostics?.waitSeconds || 0}));
}

async function waitUntilChanged(application, previousSnapshot, options = {}) {
  return safe("sync.waitUntilChanged", {application, previousSnapshot, timeoutMs:options.timeoutMs, pollMs:options.pollMs, compact:options.compact}, value => ({ok:true, state:value.state, changed:true, snapshot:value.snapshot, method:value.observation.method, attempts:value.diagnostics?.attempts || 0, waitSeconds:value.diagnostics?.waitSeconds || 0}));
}

async function waitUntilSnapshotCondition(application, predicate, options = {}) {
  const timeoutMs = Number(options.timeoutMs || 12000);
  const pollMs = Number(options.pollMs || 300);
  const compact = options.compact === undefined ? true : Boolean(options.compact);
  const started = Date.now();
  let attempts = 0;
  while (Date.now() - started <= timeoutMs) {
    attempts += 1;
    const observed = snapshot({app:application, compact});
    if (!observed.ok) return observed;
    const evidence = predicate(observed.snapshot);
    if (evidence) return {ok:true, state:"SATISFIED", snapshot:observed.snapshot, evidence, attempts, waitSeconds:(Date.now() - started) / 1000};
    sleep(pollMs);
  }
  return {ok:false, state:"TIMEOUT", error:"CONDITION_TIMEOUT", detail:"snapshot condition not satisfied", attempts, waitSeconds:(Date.now() - started) / 1000, recoveryPolicy:"NONE"};
}

const waitUntil = waitUntilSnapshotCondition;

function windowCall(method, {app, window, position, size} = {}, map = value => value) {
  return safe(method, {application:app, window, position, size}, value => map({...value, method:value.backend?.strategy, verificationMethod:value.verification?.method, actionSeconds:value.diagnostics?.actionSeconds || 0, observeSeconds:value.diagnostics?.observeSeconds || 0}));
}

const listWindows = ({app}) => safe("window.list", {application:app}, value => ({ok:true, state:value.state, windows:value.windows, method:value.observation.method}));
const getCurrentWindow = ({app}) => safe("window.getCurrent", {application:app}, value => ({ok:true, state:value.state, window:value.window, method:value.observation.method}));
const focusWindow = params => windowCall("window.focus", params);
const closeWindow = params => windowCall("window.close", params);
const minimizeWindow = params => windowCall("window.minimize", params);
const restoreWindow = params => windowCall("window.restore", params);
const maximizeWindow = params => windowCall("window.maximize", params);
const moveWindow = params => windowCall("window.move", params);
const resizeWindow = params => windowCall("window.resize", params);

module.exports = {
  runtimeInfo, ensureRuntime, shutdownRuntime, ensureReady, getForeground,
  snapshot, find, get, getBounds, focus, click, press, setText, clear,
  waitStable, waitUntilChanged, waitUntilSnapshotCondition, waitUntil,
  listWindows, getCurrentWindow, focusWindow, closeWindow, minimizeWindow,
  restoreWindow, maximizeWindow, moveWindow, resizeWindow,
};
