#!/usr/bin/env node
"use strict";

/*
 * Physical promotion harness.
 *
 * This harness creates an isolated TextEdit fixture, launches the local runtime,
 * observes a fresh snapshot, resolves the editable surface by semantic role,
 * applies strict setText through the SDK, saves, closes, and removes the fixture.
 */

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {spawn, spawnSync} = require("node:child_process");
const {ComputerControlClient} = require("../../sdk/typescript/src");

const ROOT = path.resolve(__dirname, "../..");
const NODE = process.env.RUMIAI_CC_NODE || process.execPath;
const LEGACY_PATH = process.env.RUMIAI_CC_LEGACY_MODULE ||
  "/Volumes/RumiAI/rumiai-computer-use-PoCs/app/computer-control/index.js";
const SOCKET = process.env.RUMIAI_CC_SOCKET || "/tmp/rumiai-computer-control-physical.sock";

function waitForRuntime(child) {
  return new Promise((resolve, reject) => {
    let output = "";
    const timer = setTimeout(() => reject(new Error("runtime startup timeout")), 10000);
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", chunk => {
      output += chunk;
      if (output.includes('"event":"runtime.ready"')) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.once("exit", code => {
      clearTimeout(timer);
      reject(new Error(`runtime exited before ready: ${code}`));
    });
  });
}

async function main() {
  const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "rumiai-cc-physical-"));
  const fixturePath = path.join(fixtureDir, "computer-control-set-text.txt");
  const requested = "Ciao RumiAI.";
  fs.writeFileSync(fixturePath, "Initial fixture text", "utf8");

  const legacy = require(LEGACY_PATH);
  const preparedRuntime = legacy.ensureRuntime();
  if (!preparedRuntime.ok) throw new Error(preparedRuntime.detail || "legacy runtime unavailable");
  const opened = spawnSync("/usr/bin/open", ["-a", "TextEdit", fixturePath]);
  if (opened.status !== 0) throw new Error("could not open isolated TextEdit fixture");
  const appReady = await legacy.ensureReady("TextEdit");
  if (!appReady.ok) throw new Error(appReady.detail || "TextEdit fixture not ready");

  const runtime = spawn(NODE, [path.join(ROOT, "runtime/src/cli.js")], {
    cwd:ROOT,
    env:{...process.env, RUMIAI_CC_SOCKET:SOCKET, RUMIAI_CC_LEGACY_MODULE:LEGACY_PATH},
    stdio:["ignore", "pipe", "pipe"],
  });
  let failed = false;
  try {
    await waitForRuntime(runtime);
    const client = new ComputerControlClient({socketPath:SOCKET});
    const info = await client.runtimeInfo();
    const ready = await client.ensureReady();
    const snapshot = await client.snapshot({application:"TextEdit", settle:true, compact:true});

    let editable = null;
    for (const role of ["text-area", "textarea", "text-field"]) {
      try {
        editable = await client.find({application:"TextEdit", role, snapshot:snapshot.snapshot});
        if (editable?.target?.ref) break;
      } catch (_) {}
    }
    if (!editable?.target?.ref) throw new Error("fresh snapshot exposed no editable semantic surface");

    const result = await client.setText({
      application:"TextEdit",
      target:editable.target,
      text:requested,
    });

    console.log(`runtime-info=${info.contractVersion === "0.2.0" ? "PASS" : "FAIL"}`);
    console.log(`runtime-ready=${ready.verified === true ? "PASS" : "FAIL"}`);
    console.log(`snapshot-observed=${snapshot.state === "OBSERVED" ? "PASS" : "FAIL"}`);
    console.log(`editable-ref-fresh=${/^@e\d+$/.test(editable.target.ref) ? "PASS" : "FAIL"}`);
    console.log(`editable-role=${editable.target.role}`);
    console.log(`set-text-state=${result.state}`);
    console.log(`set-text-verified=${result.verified === true}`);
    console.log(`set-text-verification=${result.verification?.method || "none"}`);
    const pass = result.verified === true && result.verification?.method === "ax-text-exact";
    console.log(`physical-runtime-snapshot-find-set-text=${pass ? "PASS" : "FAIL"}`);
    failed = !pass;
  } finally {
    try { legacy.press({app:"TextEdit", keys:"Cmd+S", settle:true}); } catch (_) {}
    try { legacy.press({app:"TextEdit", keys:"Cmd+W", settle:true}); } catch (_) {}
    runtime.kill("SIGTERM");
    await new Promise(resolve => runtime.once("exit", resolve));
    try { legacy.shutdownRuntime(); } catch (_) {}
    if (fs.existsSync(fixturePath)) fs.unlinkSync(fixturePath);
    if (fs.existsSync(fixtureDir)) fs.rmdirSync(fixtureDir);
  }
  process.exitCode = failed ? 1 : 0;
}

main().catch(error => {
  console.error(`physical-runtime-set-text=BLOCKED`);
  console.error(error.message);
  process.exit(1);
});
