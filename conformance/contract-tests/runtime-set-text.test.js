"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const {createRouter} = require("../../runtime/src/router");
const {createServer} = require("../../runtime/src/server");
const {createLegacyMacOSBackend} = require("../../backends/macos/legacy-validated-backend");
const {ComputerControlClient} = require("../../sdk/typescript/src");

function mockLegacy() {
  return {
    ensureRuntime:() => ({ok:true, started:true, method:"mock-ready"}),
    shutdownRuntime:() => ({ok:true, method:"mock-stopped"}),
    setText:({app, element, text, verify}) => ({
      ok:true,
      state:"VERIFIED",
      verified:verify === true,
      verificationMethod:"ax-text-exact",
      observed:text,
      method:"ax-fill",
      attempts:[{method:"ax-fill", action:"DELIVERED", verified:true, verification:"ax-text-exact"}],
      application:app,
      ref:element.ref,
    }),
  };
}

test("runtime.info and ui.setText cross the local RPC boundary", async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "rumiai-cc-test-"));
  const socketPath = path.join(directory, "runtime.sock");
  const backend = createLegacyMacOSBackend({legacyModule:mockLegacy()});
  const server = createServer({socketPath, route:createRouter(backend)});
  await server.listen();
  t.after(async () => {
    await server.close();
    fs.rmdirSync(directory);
  });

  const client = new ComputerControlClient({socketPath, timeoutMs:2000});
  const info = await client.runtimeInfo();
  assert.equal(info.contractVersion, "0.1.0");
  assert.equal(info.backend.name, "macos-agent-ctrl-v46-transition");
  assert.equal(info.capabilities.find(item => item.name === "ui.setText").available, true);

  const ready = await client.ensureReady();
  assert.equal(ready.verified, true);

  const result = await client.setText({
    application:"TextEdit",
    target:{ref:"@e0", role:"text-field"},
    text:"Ciao RumiAI.",
  });
  assert.equal(result.ok, true);
  assert.equal(result.verified, true);
  assert.equal(result.verification.method, "ax-text-exact");
  assert.equal(result.backend.strategy, "ax-fill");

  const stopped = await client.shutdownRuntime();
  assert.equal(stopped.state, "STOPPED");
});

test("ui.setText rejects empty text without invoking GUI recovery", async () => {
  const backend = createLegacyMacOSBackend({legacyModule:mockLegacy()});
  const route = createRouter(backend);
  await assert.rejects(
    route("ui.setText", {application:"TextEdit", target:{ref:"@e0"}, text:""}),
    error => error.code === "EMPTY_TEXT_REQUIRES_CLEAR" && error.recoveryPolicy === "NONE"
  );
});
