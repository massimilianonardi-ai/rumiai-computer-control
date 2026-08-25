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
        version:"0.2.0",
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
