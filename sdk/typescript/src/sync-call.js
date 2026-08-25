#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const {ComputerControlClient} = require("./index");

async function main() {
  const raw = fs.readFileSync(0, "utf8");
  const request = JSON.parse(raw);
  const client = new ComputerControlClient({
    socketPath:request.socketPath,
    timeoutMs:request.timeoutMs || 20000,
  });
  const result = await client.call(request.method, request.params || {});
  process.stdout.write(JSON.stringify({ok:true, result}));
}

main().catch(error => {
  process.stdout.write(JSON.stringify({
    ok:false,
    error:{
      code:error.code || "CLIENT_CALL_FAILED",
      message:error.message,
      recoveryPolicy:error.recoveryPolicy || "NONE",
      details:error.details || {},
    },
  }));
  process.exit(1);
});
