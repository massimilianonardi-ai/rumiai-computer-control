"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {ComputerControlError} = require("../../runtime/src/errors");

const DEFAULT_LEGACY_MODULE =
  "/Volumes/RumiAI/rumiai-computer-use-PoCs/app/computer-control/index.js";

function createLegacyMacOSBackend({modulePath = DEFAULT_LEGACY_MODULE, legacyModule} = {}) {
  let loaded = legacyModule || null;

  function control() {
    if (loaded) return loaded;
    const resolved = path.resolve(modulePath);
    if (!fs.existsSync(resolved)) {
      throw new ComputerControlError(
        "BACKEND_UNAVAILABLE",
        `Validated transition backend not found: ${resolved}`,
        "NONE"
      );
    }
    loaded = require(resolved);
    return loaded;
  }

  return {
    async info() {
      const available = Boolean(legacyModule) || fs.existsSync(path.resolve(modulePath));
      return {
        name:"macos-agent-ctrl-v46-transition",
        version:"0.1.0",
        platform:"macos",
        capabilities:[
          {
            name:"runtime.info",
            available:true,
            validationState:"BOUNDARY_PASS",
            strategies:["local-json-rpc"],
          },
          {
            name:"ui.setText",
            available,
            validationState:"BOUNDARY_PASS",
            strategies:["ax-fill", "clipboard-paste", "typing"],
          },
        ],
      };
    },

    async ensureReady() {
      const result = control().ensureRuntime();
      if (!result?.ok) throw legacyFailure(result, "BACKEND_START_FAILED");
      return {
        ok:true,
        state:"READY",
        verified:true,
        verification:{method:"backend-runtime-ready", evidence:{started:Boolean(result.started)}},
        backend:{name:"macos-agent-ctrl-v46-transition", strategy:result.method || "agent-ctrl"},
      };
    },

    async shutdown() {
      if (!loaded) {
        return {
          ok:true,
          state:"STOPPED",
          verified:true,
          verification:{method:"runtime-not-loaded", evidence:{}},
          backend:{name:"macos-agent-ctrl-v46-transition", strategy:"idempotent-noop"},
        };
      }
      const result = loaded.shutdownRuntime();
      if (!result?.ok) throw legacyFailure(result, "BACKEND_SHUTDOWN_FAILED");
      return {
        ok:true,
        state:"STOPPED",
        verified:true,
        verification:{method:"backend-runtime-stopped", evidence:{}},
        backend:{name:"macos-agent-ctrl-v46-transition", strategy:result.method || "agent-ctrl"},
      };
    },

    async setText({application, target, text}) {
      const result = control().setText({
        app:application,
        element:{ref:target.ref, role:target.role, name:target.name},
        text,
        verify:true,
      });

      if (!result?.ok || result.verified !== true) {
        throw legacyFailure(result, "SET_TEXT_VERIFICATION_FAILED");
      }

      return {
        ok:true,
        state:"VERIFIED",
        verified:true,
        verification:{
          method:result.verificationMethod || "ax-text-exact",
          evidence:{observed:result.observed, attempts:result.attempts || []},
        },
        backend:{
          name:"macos-agent-ctrl-v46-transition",
          strategy:result.method || "unknown",
          fallback:Boolean(result.attempts?.length > 1),
        },
        diagnostics:{
          actionSeconds:result.actionSeconds || 0,
          observeSeconds:result.observeSeconds || 0,
          totalSeconds:result.totalSeconds || 0,
        },
      };
    },
  };
}

function legacyFailure(result, fallbackCode) {
  return new ComputerControlError(
    result?.error || fallbackCode,
    result?.detail || fallbackCode,
    "NONE",
    {state:result?.state || "FAILED", method:result?.method || "none"}
  );
}

module.exports = {createLegacyMacOSBackend, DEFAULT_LEGACY_MODULE};
