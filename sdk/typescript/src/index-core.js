"use strict";

const net = require("node:net");

class ComputerControlClient {
  constructor({socketPath = "/tmp/rumiai-computer-control.sock", timeoutMs = 15000} = {}) {
    this.socketPath = socketPath;
    this.timeoutMs = timeoutMs;
    this.nextId = 1;
  }

  runtimeInfo() { return this.call("runtime.info"); }
  ensureReady() { return this.call("runtime.ensureReady"); }
  ensureApplicationReady({application, timeoutMs}) { return this.call("application.ensureReady", {application, timeoutMs}); }
  getForeground() { return this.call("application.getForeground"); }
  shutdownRuntime() { return this.call("runtime.shutdown"); }
  setText({application, target, text}) { return this.call("ui.setText", {application, target, text}); }
  snapshot({application, settle = false, compact = true, previousSnapshot = null}) { return this.call("ui.snapshot", {application, settle, compact, previousSnapshot}); }
  describe({application, target}) { return this.call("ui.describe", {application, target}); }
  getTextSelection({application, target}) { return this.call("ui.getTextSelection", {application, target}); }
  invoke({application, target, settle = true}) { return this.call("ui.invoke", {application, target, settle}); }
  find({application, query = "", role = null, first = true, snapshot = null}) { return this.call("ui.find", {application, query, role, first, snapshot}); }
  get({application, target, property}) { return this.call("ui.get", {application, target, property}); }
  getBounds({application, target}) { return this.call("ui.getBounds", {application, target}); }
  focus({application, target}) { return this.call("ui.focus", {application, target}); }
  click({application, target, settle = true}) { return this.call("ui.click", {application, target, settle}); }
  press({application, keys, settle = true}) { return this.call("ui.press", {application, keys, settle}); }
  clear({application, target}) { return this.call("ui.clear", {application, target}); }
  readClipboard() { return this.call("clipboard.read"); }
  writeClipboard(text) { return this.call("clipboard.write", {text}); }
  copy() { return this.call("clipboard.copy"); }
  paste() { return this.call("clipboard.paste"); }
  waitStable({application, timeoutMs = 5000, pollMs = 200}) { return this.call("sync.waitStable", {application, timeoutMs, pollMs}); }
  waitUntilChanged({application, previousSnapshot, timeoutMs = 12000, pollMs = 300, compact = true}) { return this.call("sync.waitUntilChanged", {application, previousSnapshot, timeoutMs, pollMs, compact}); }
  listWindows(application) { return this.call("window.list", {application}); }
  getCurrentWindow(application) { return this.call("window.getCurrent", {application}); }
  focusWindow(application, window) { return this.call("window.focus", {application, window}); }
  closeWindow(application) { return this.call("window.close", {application}); }
  minimizeWindow(application, window) { return this.call("window.minimize", {application, window}); }
  restoreWindow(application, window) { return this.call("window.restore", {application, window}); }
  maximizeWindow(application, window) { return this.call("window.maximize", {application, window}); }
  moveWindow(application, window, position) { return this.call("window.move", {application, window, position}); }
  resizeWindow(application, window, size) { return this.call("window.resize", {application, window, size}); }

  call(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const socket = net.createConnection(this.socketPath);
      let buffer = "";
      const timer = setTimeout(() => { socket.destroy(); reject(new Error(`Computer Control timeout: ${method}`)); }, this.timeoutMs);
      socket.setEncoding("utf8");
      socket.once("connect", () => { socket.write(`${JSON.stringify({jsonrpc:"2.0", id, method, params})}\n`); });
      socket.on("data", chunk => {
        buffer += chunk;
        const newline = buffer.indexOf("\n");
        if (newline === -1) return;
        clearTimeout(timer);
        socket.end();
        try {
          const response = JSON.parse(buffer.slice(0, newline));
          if (response.error) {
            const error = new Error(response.error.data?.message || response.error.message);
            error.code = response.error.data?.code || "RPC_ERROR";
            error.recoveryPolicy = response.error.data?.recoveryPolicy || "NONE";
            error.details = response.error.data?.details || {};
            reject(error);
            return;
          }
          resolve(response.result);
        } catch (error) { reject(error); }
      });
      socket.once("error", error => { clearTimeout(timer); reject(error); });
    });
  }
}

module.exports = {ComputerControlClient};
