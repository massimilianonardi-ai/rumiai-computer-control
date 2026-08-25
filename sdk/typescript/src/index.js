"use strict";

const net = require("node:net");

class ComputerControlClient {
  constructor({socketPath = "/tmp/rumiai-computer-control.sock", timeoutMs = 15000} = {}) {
    this.socketPath = socketPath;
    this.timeoutMs = timeoutMs;
    this.nextId = 1;
  }

  runtimeInfo() {
    return this.call("runtime.info");
  }

  ensureReady() {
    return this.call("runtime.ensureReady");
  }

  shutdownRuntime() {
    return this.call("runtime.shutdown");
  }

  setText({application, target, text}) {
    return this.call("ui.setText", {application, target, text});
  }

  snapshot({application, settle = false, compact = true, previousSnapshot = null}) {
    return this.call("ui.snapshot", {application, settle, compact, previousSnapshot});
  }

  find({application, query = "", role = null, first = true, snapshot = null}) {
    return this.call("ui.find", {application, query, role, first, snapshot});
  }

  call(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const socket = net.createConnection(this.socketPath);
      let buffer = "";
      const timer = setTimeout(() => {
        socket.destroy();
        reject(new Error(`Computer Control timeout: ${method}`));
      }, this.timeoutMs);

      socket.setEncoding("utf8");
      socket.once("connect", () => {
        socket.write(`${JSON.stringify({jsonrpc:"2.0", id, method, params})}\n`);
      });
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
        } catch (error) {
          reject(error);
        }
      });
      socket.once("error", error => {
        clearTimeout(timer);
        reject(error);
      });
    });
  }
}

module.exports = {ComputerControlClient};
