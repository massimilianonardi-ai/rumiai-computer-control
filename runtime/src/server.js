"use strict";

const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");
const {errorData} = require("./errors");

const MAX_LINE_BYTES = 1024 * 1024;

function createServer({socketPath, route}) {
  if (!socketPath || !path.isAbsolute(socketPath)) {
    throw new TypeError("An absolute local socket path is required");
  }
  if (typeof route !== "function") throw new TypeError("A route function is required");

  const server = net.createServer(socket => {
    socket.setEncoding("utf8");
    let buffer = "";

    socket.on("data", chunk => {
      buffer += chunk;
      if (Buffer.byteLength(buffer, "utf8") > MAX_LINE_BYTES) {
        socket.destroy(new Error("request exceeds local runtime limit"));
        return;
      }

      let newline;
      while ((newline = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        if (line.trim()) void handleLine(socket, line, route);
      }
    });
  });

  async function listen() {
    if (process.platform !== "win32" && fs.existsSync(socketPath)) {
      const stat = fs.lstatSync(socketPath);
      if (!stat.isSocket()) throw new Error(`refusing to replace non-socket path: ${socketPath}`);
      fs.unlinkSync(socketPath);
    }

    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(socketPath, () => {
        server.off("error", reject);
        resolve();
      });
    });
    if (process.platform !== "win32") fs.chmodSync(socketPath, 0o600);
  }

  async function close() {
    if (!server.listening) return;
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    if (process.platform !== "win32" && fs.existsSync(socketPath)) fs.unlinkSync(socketPath);
  }

  return {listen, close, server, socketPath};
}

async function handleLine(socket, line, route) {
  let request;
  try {
    request = JSON.parse(line);
    if (request?.jsonrpc !== "2.0" || typeof request.method !== "string") {
      throw new Error("invalid JSON-RPC request");
    }
  } catch (error) {
    write(socket, {jsonrpc:"2.0", id:null, error:{code:-32600, message:"Invalid Request"}});
    return;
  }

  try {
    const result = await route(request.method, request.params || {});
    write(socket, {jsonrpc:"2.0", id:request.id ?? null, result});
  } catch (error) {
    write(socket, {
      jsonrpc:"2.0",
      id:request.id ?? null,
      error:{code:-32000, message:"Computer Control operation failed", data:errorData(error)},
    });
  }
}

function write(socket, message) {
  socket.write(`${JSON.stringify(message)}\n`);
}

module.exports = {createServer, MAX_LINE_BYTES};
