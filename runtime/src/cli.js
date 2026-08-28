#!/usr/bin/env node
"use strict";

const path = require("node:path");
const {createRouter} = require("./router");
const {createServer} = require("./server");
const {createMacOSBackend} = require("../../backends/macos/backend-low-level");

const socketPath = process.env.RUMIAI_CC_SOCKET || "/tmp/rumiai-computer-control.sock";

async function main() {
  if (process.platform !== "darwin") {
    throw new Error("The current runtime supports the macOS backend only");
  }

  const backend = createMacOSBackend({
    modulePath:process.env.RUMIAI_CC_BACKEND_MODULE,
  });
  const server = createServer({socketPath:path.resolve(socketPath), route:createRouter(backend)});
  await server.listen();
  process.stdout.write(`${JSON.stringify({event:"runtime.ready", socketPath:server.socketPath})}\n`);

  let closing = false;
  async function close(signal) {
    if (closing) return;
    closing = true;
    try { await backend.shutdown(); } catch (_) {}
    await server.close();
    process.stdout.write(`${JSON.stringify({event:"runtime.stopped", signal})}\n`);
  }

  process.on("SIGINT", () => void close("SIGINT").then(() => process.exit(0)));
  process.on("SIGTERM", () => void close("SIGTERM").then(() => process.exit(0)));
}

main().catch(error => {
  process.stderr.write(`${JSON.stringify({event:"runtime.failed", message:error.message})}\n`);
  process.exit(1);
});
