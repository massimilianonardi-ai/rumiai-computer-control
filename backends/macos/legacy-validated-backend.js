"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {ComputerControlError} = require("../../runtime/src/errors");

const DEFAULT_LEGACY_MODULE =
  "/Volumes/RumiAI/rumiai-computer-use-PoCs/app/computer-control/index.js";

function createLegacyMacOSBackend({modulePath = DEFAULT_LEGACY_MODULE, legacyModule} = {}) {
  let loaded = legacyModule || null;
  let primitives = null;

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

  function backendPrimitives() {
    if (primitives) return primitives;
    if (legacyModule && typeof legacyModule.clipboardRead === "function") {
      primitives = legacyModule;
      return primitives;
    }
    const backendPath = path.join(path.dirname(path.resolve(modulePath)), "backends", "agent-ctrl.js");
    if (!fs.existsSync(backendPath)) {
      throw new ComputerControlError("BACKEND_UNAVAILABLE", `Backend primitives not found: ${backendPath}`, "NONE");
    }
    primitives = require(backendPath);
    return primitives;
  }

  return {
    async info() {
      const available = Boolean(legacyModule) || fs.existsSync(path.resolve(modulePath));
      return {
        name:"macos-agent-ctrl-v46-transition",
        version:"0.4.0",
        platform:"macos",
        capabilities:[
          {
            name:"runtime.info",
            available:true,
            validationState:"PHYSICALLY_VALIDATED",
            strategies:["local-json-rpc"],
          },
          {
            name:"ui.setText",
            available,
            validationState:"PHYSICALLY_VALIDATED",
            strategies:["ax-fill", "clipboard-paste", "typing"],
          },
          {
            name:"ui.snapshot",
            available,
            validationState:"PHYSICALLY_VALIDATED",
            strategies:["accessibility-tree"],
          },
          {
            name:"ui.find",
            available,
            validationState:"PHYSICALLY_VALIDATED",
            strategies:["snapshot-semantic", "backend-semantic"],
          },
          {name:"application.ensureReady", available, validationState:"PHYSICALLY_VALIDATED", strategies:["provider-desktop-readiness"]},
          {name:"application.getForeground", available, validationState:"PHYSICALLY_VALIDATED", strategies:["native-foreground-observation"]},
          {name:"ui.get", available, validationState:"PHYSICALLY_VALIDATED", strategies:["accessibility-property"]},
          {name:"ui.getBounds", available, validationState:"PHYSICALLY_VALIDATED", strategies:["accessibility-bounds"]},
          {name:"ui.focus", available, validationState:"PHYSICALLY_VALIDATED", strategies:["ax-focus"]},
          {name:"ui.click", available, validationState:"PHYSICALLY_VALIDATED", strategies:["ax-click", "runtime-bounds-pointer"]},
          {name:"ui.press", available, validationState:"PHYSICALLY_VALIDATED", strategies:["keyboard-delivery"]},
          {name:"ui.clear", available, validationState:"PHYSICALLY_VALIDATED", strategies:["ax-fill-empty", "select-delete", "clipboard-empty"]},
          {name:"clipboard.read", available, validationState:"PHYSICALLY_VALIDATED", strategies:["system-clipboard"]},
          {name:"clipboard.write", available, validationState:"PHYSICALLY_VALIDATED", strategies:["system-clipboard-readback"]},
          {name:"clipboard.copy", available, validationState:"PHYSICALLY_VALIDATED", strategies:["keyboard-copy-delivery"]},
          {name:"clipboard.paste", available, validationState:"PHYSICALLY_VALIDATED", strategies:["keyboard-paste-delivery"]},
        ],
      };
    },

    async ensureRuntime() {
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

    async ensureApplicationReady({application, timeoutMs}) {
      const result = await control().ensureReady(application, timeoutMs ? {timeoutMs} : {});
      if (!result?.ok) throw legacyFailure(result, "APPLICATION_NOT_READY");
      return {
        ok:true,
        state:"READY",
        verified:true,
        application:{name:result.currentApp || application},
        snapshot:String(result.snapshot || ""),
        verification:{method:"application-snapshot-ready", evidence:{snapshotObserved:Boolean(result.snapshot)}},
        backend:{name:"macos-agent-ctrl-v46-transition", strategy:result.method || "provider-desktop-readiness"},
        diagnostics:result.diagnostics || {},
      };
    },

    async getForeground() {
      const result = control().getForeground();
      if (!result?.ok) throw legacyFailure(result, "FOREGROUND_OBSERVATION_FAILED");
      return {
        state:"OBSERVED",
        application:{
          name:result.name || result.application?.name || "",
          bundle:result.bundle || result.application?.bundle || null,
          pid:result.pid || result.application?.pid || null,
        },
        observation:{method:result.method || "native-foreground-observation"},
        backend:{name:"macos-agent-ctrl-v46-transition", strategy:result.method || "native-foreground-observation"},
        diagnostics:{observeSeconds:result.observeSeconds || 0, totalSeconds:result.totalSeconds || 0},
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

    async snapshot({application, settle = false, compact = true, previousSnapshot = null}) {
      const result = control().snapshot({
        app:application,
        settle:Boolean(settle),
        compact:compact !== false,
        previousSnapshot,
      });
      if (!result?.ok) throw legacyFailure(result, "SNAPSHOT_FAILED");
      const value = String(result.snapshot || "");
      return {
        state:"OBSERVED",
        snapshot:value,
        nodes:parseActionableSnapshot(value),
        changed:result.changed == null ? null : Boolean(result.changed),
        observation:{method:result.method || "accessibility-tree"},
        backend:{name:"macos-agent-ctrl-v46-transition", strategy:result.method || "accessibility-tree"},
        diagnostics:{
          observeSeconds:result.observeSeconds || 0,
          totalSeconds:result.totalSeconds || 0,
        },
      };
    },

    async find({application, query = "", role = null, first = true, snapshot = null}) {
      const wanted = String(query || "").trim();
      const wantedRole = String(role || "").trim();

      if (snapshot != null) {
        const matches = findSnapshotNodes(String(snapshot), wanted, wantedRole, first !== false);
        if (matches.length) return foundResult(matches, wanted, wantedRole, "snapshot-semantic", "snapshot");
      }

      if (!wanted) {
        const fresh = await this.snapshot({application, settle:false, compact:true});
        const matches = findSnapshotNodes(fresh.snapshot, "", wantedRole, first !== false);
        if (matches.length) return foundResult(matches, wanted, wantedRole, "fresh-snapshot-role", "snapshot");
        throw new ComputerControlError(
          "ELEMENT_NOT_FOUND",
          `No enabled element found for role ${wantedRole}`,
          "NONE"
        );
      }

      const result = control().find({
        app:application,
        query:wanted,
        role:wantedRole || null,
        first:first !== false,
        snapshot,
      });
      if (!result?.ok) throw legacyFailure(result, "ELEMENT_NOT_FOUND");
      const snapshotNodes = snapshot == null ? [] : parseActionableSnapshot(snapshot);
      const targets = (result.refs || [result.ref]).filter(Boolean).map(ref => {
        const observed = snapshotNodes.find(node => node.ref === ref);
        return observed || {ref, role:wantedRole, name:wanted};
      });
      return foundResult(targets, wanted, wantedRole, result.method || "backend-semantic", result.source || "backend");
    },

    async get({application, target, property}) {
      const result = control().get({app:application, element:target, property});
      if (!result?.ok) throw legacyFailure(result, "PROPERTY_OBSERVATION_FAILED");
      return {
        state:"OBSERVED",
        target:{...target, ref:result.ref || target.ref},
        property:String(property),
        value:decodeObservedScalar(result.raw, result.value),
        observation:{method:result.method || "accessibility-property"},
        backend:{name:"macos-agent-ctrl-v46-transition", strategy:result.method || "accessibility-property"},
        diagnostics:{observeSeconds:result.observeSeconds || 0, totalSeconds:result.totalSeconds || 0},
      };
    },

    async getBounds({application, target}) {
      const result = control().getBounds({app:application, element:target});
      if (!result?.ok || !result.bounds) throw legacyFailure(result, "BOUNDS_OBSERVATION_FAILED");
      return {
        state:"OBSERVED",
        target:{...target, ref:result.ref || target.ref},
        bounds:result.bounds,
        observation:{method:result.method || "accessibility-bounds"},
        backend:{name:"macos-agent-ctrl-v46-transition", strategy:result.method || "accessibility-bounds"},
        diagnostics:{observeSeconds:result.observeSeconds || 0, totalSeconds:result.totalSeconds || 0},
      };
    },

    async focus({application, target}) {
      const result = control().focus({app:application, element:target, verify:true});
      if (!result?.ok) throw legacyFailure(result, "FOCUS_ACTION_FAILED");
      return deliveredResult("FOCUS_DELIVERED", result, {
        target,
        semanticConsequenceVerified:result.verified === true,
        semanticVerification:result.verificationMethod || "not-observed",
      });
    },

    async click({application, target, settle = true}) {
      const result = control().click({app:application, element:target, settle:Boolean(settle)});
      if (!result?.ok) throw legacyFailure(result, "CLICK_ACTION_FAILED");
      return deliveredResult("CLICK_DELIVERED", result, {
        target,
        fallback:Boolean(result.fallbackUsed),
        boundsObserved:result.boundsObserved,
      });
    },

    async press({application, keys, settle = true}) {
      const result = control().press({app:application, keys, settle:Boolean(settle)});
      if (!result?.ok) throw legacyFailure(result, "KEY_DELIVERY_FAILED");
      return deliveredResult("KEYS_DELIVERED", result, {
        keys:String(keys),
        semanticConsequenceVerified:false,
      });
    },

    async clear({application, target}) {
      const result = control().clear({app:application, element:target, verify:true});
      if (!result?.ok || result.verified !== true) throw legacyFailure(result, "CLEAR_VERIFICATION_FAILED");
      return {
        ok:true,
        state:"CLEARED",
        verified:true,
        verification:{method:result.verificationMethod || "ax-text-exact", evidence:{observed:"", attempts:result.attempts || []}},
        backend:{name:"macos-agent-ctrl-v46-transition", strategy:result.method || "unknown", fallback:Boolean(result.attempts?.length > 1)},
        diagnostics:{actionSeconds:result.actionSeconds || 0, observeSeconds:result.observeSeconds || 0, totalSeconds:result.totalSeconds || 0},
      };
    },

    async readClipboard() {
      const result = backendPrimitives().clipboardRead();
      if (!result?.ok) throw legacyFailure(result, "CLIPBOARD_READ_FAILED");
      return {
        state:"OBSERVED",
        text:decodeObservedScalar(result.stdout, ""),
        observation:{method:result.method || "system-clipboard"},
        backend:{name:"macos-agent-ctrl-v46-transition", strategy:result.method || "system-clipboard"},
      };
    },

    async writeClipboard({text}) {
      const result = backendPrimitives().clipboardWrite(String(text));
      if (!result?.ok) throw legacyFailure(result, "CLIPBOARD_WRITE_FAILED");
      const observed = backendPrimitives().clipboardRead();
      const value = observed?.ok ? decodeObservedScalar(observed.stdout, "") : null;
      if (value !== String(text)) {
        throw new ComputerControlError("CLIPBOARD_WRITE_UNVERIFIED", "Clipboard readback did not equal requested text", "NONE");
      }
      return deliveredResult("WRITTEN", result, {verification:{method:"clipboard-readback-exact", evidence:{length:value.length}}});
    },

    async copy() {
      const result = backendPrimitives().clipboardCopy();
      if (!result?.ok) throw legacyFailure(result, "CLIPBOARD_COPY_FAILED");
      return deliveredResult("COPY_DELIVERED", result);
    },

    async paste() {
      const result = backendPrimitives().clipboardPaste();
      if (!result?.ok) throw legacyFailure(result, "CLIPBOARD_PASTE_FAILED");
      return deliveredResult("PASTE_DELIVERED", result);
    },
  };
}

function deliveredResult(state, result, extra = {}) {
  return {
    ok:true,
    state,
    verified:true,
    verification:{
      method:"backend-action-delivered",
      evidence:{backendMethod:result.method || "unknown"},
    },
    backend:{
      name:"macos-agent-ctrl-v46-transition",
      strategy:result.method || "unknown",
      fallback:Boolean(result.fallbackUsed),
    },
    diagnostics:{
      actionSeconds:result.actionSeconds || 0,
      observeSeconds:result.observeSeconds || 0,
      totalSeconds:result.totalSeconds || 0,
    },
    ...extra,
  };
}

function parseActionableSnapshot(snapshot) {
  const nodes = [];
  for (const raw of String(snapshot || "").split("\n")) {
    if (!raw.trim() || raw.startsWith("#")) continue;
    const match = raw.match(/^\s*(@e\d+)\s+([^\s]+)(?:\s+"([^"]*)")?/);
    if (!match) continue;
    nodes.push({
      ref:match[1],
      role:match[2] || "",
      name:match[3] || "",
      disabled:/\[disabled\]/.test(raw),
    });
  }
  return nodes;
}

function normalize(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeObservedScalar(raw, fallback) {
  let value = String(raw == null ? fallback ?? "" : raw).replace(/\r?\n$/, "");
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    try {
      const decoded = JSON.parse(value);
      if (typeof decoded === "string") return decoded;
    } catch (_) {}
  }
  return value;
}

function findSnapshotNodes(snapshot, query, role, first) {
  const wanted = normalize(query);
  const wantedRole = normalize(role);
  let candidates = parseActionableSnapshot(snapshot).filter(node => !node.disabled);
  if (wantedRole) candidates = candidates.filter(node => normalize(node.role) === wantedRole);
  if (wanted) {
    const exact = candidates.filter(node => normalize(node.name) === wanted);
    candidates = exact.length ? exact : candidates.filter(node => normalize(node.name).includes(wanted));
  }
  return first ? candidates.slice(0, 1) : candidates;
}

function foundResult(targets, query, role, method, source) {
  return {
    state:"FOUND",
    query:query || null,
    role:role || null,
    target:targets[0],
    targets,
    source,
    observation:{method},
    backend:{name:"macos-agent-ctrl-v46-transition", strategy:method},
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

module.exports = {
  createLegacyMacOSBackend,
  DEFAULT_LEGACY_MODULE,
  parseActionableSnapshot,
  findSnapshotNodes,
};
