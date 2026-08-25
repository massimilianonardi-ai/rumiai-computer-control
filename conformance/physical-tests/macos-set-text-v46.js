#!/usr/bin/env node
"use strict";

/*
 * Physical promotion harness.
 *
 * Preconditions:
 * - the runtime is running with the validated transition backend;
 * - TextEdit has a ready document;
 * - RUMIAI_CC_ELEMENT_REF contains the freshly observed editable @e reference.
 *
 * Fixture creation and element observation intentionally remain outside this
 * first public slice. The harness refuses to invent or persist an element ref.
 */

const {ComputerControlClient} = require("../../sdk/typescript/src");

async function main() {
  const ref = String(process.env.RUMIAI_CC_ELEMENT_REF || "").trim();
  if (!/^@e\d+$/.test(ref)) {
    throw new Error("RUMIAI_CC_ELEMENT_REF must be a fresh observed @e reference");
  }

  const client = new ComputerControlClient({
    socketPath:process.env.RUMIAI_CC_SOCKET || "/tmp/rumiai-computer-control.sock",
  });
  const info = await client.runtimeInfo();
  const ready = await client.ensureReady();
  const result = await client.setText({
    application:"TextEdit",
    target:{ref, role:"text-field"},
    text:"Ciao RumiAI.",
  });

  console.log(`runtime-info=${info.contractVersion === "0.1.0" ? "PASS" : "FAIL"}`);
  console.log(`runtime-ready=${ready.verified === true ? "PASS" : "FAIL"}`);
  console.log(`set-text-state=${result.state}`);
  console.log(`set-text-verified=${result.verified === true}`);
  console.log(`set-text-verification=${result.verification?.method || "none"}`);
  console.log(`physical-runtime-set-text=${result.verified === true ? "PASS" : "FAIL"}`);
  process.exitCode = result.verified === true ? 0 : 1;
}

main().catch(error => {
  console.error(`physical-runtime-set-text=BLOCKED`);
  console.error(error.message);
  process.exit(1);
});
