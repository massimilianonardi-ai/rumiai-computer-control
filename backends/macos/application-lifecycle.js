"use strict";

const cp = require("node:child_process");
const {ComputerControlError} = require("../../runtime/src/errors");
const {
  loadProviders,
  providerAvailable,
  providerResolvedPath,
  providerForApplication,
} = require("./runtime/app/provider-manager");
const {loadDesktopPlugin} = require("./runtime/app/computer-control/desktop");
const termination = require("./runtime/app/computer-control/backends/macos-application-terminate");

const desktop = loadDesktopPlugin();
const DEFAULT_TIMEOUT_MS = 10000;
const POLL_MS = 100;

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function norm(x) { return String(x || "").trim(); }

function processCandidates(provider, identity = null) {
  return [...new Set([
    identity?.executable,
    provider?.identity?.process,
    provider?.activation?.application,
    provider?.name,
  ].map(norm).filter(Boolean))];
}

function runningProcesses(candidates) {
  const matches = [];
  for (const name of candidates) {
    const r = cp.spawnSync("/usr/bin/pgrep", ["-x", name], {encoding:"utf8"});
    if ((r.status ?? 1) !== 0) continue;
    for (const raw of String(r.stdout || "").split(/\s+/).filter(Boolean)) {
      const pid = Number(raw);
      if (Number.isInteger(pid) && pid > 0) matches.push({name, pid});
    }
  }
  return [...new Map(matches.map(item => [item.pid, item])).values()];
}

function resolveProvider(application) {
  const provider = providerForApplication(application, loadProviders());
  if (!provider) throw new ComputerControlError("PROVIDER_NOT_FOUND", `No application Provider registered for "${application}"`, "NONE", {state:"FAILED"});
  if (provider.kind !== "application") throw new ComputerControlError("UNSUPPORTED_PROVIDER_KIND", `Provider "${provider.id}" is not an application`, "NONE", {state:"FAILED"});
  const exactPath = providerResolvedPath(provider);
  const resolved = desktop.resolveApplication({provider, exactPath});
  if (!resolved?.ok || !resolved.identity) throw new ComputerControlError(resolved?.error || "APP_RESOLVE_FAILED", resolved?.detail || `Could not resolve "${provider.name}"`, "NONE", {state:"FAILED"});
  return {provider, exactPath, resolved, identity:resolved.identity};
}

function sameForeground(provider, identity, observed) {
  if (!observed?.ok) return false;
  const bundle = norm(identity?.bundle || provider?.identity?.bundle);
  if (bundle && observed.bundle) return bundle.toLowerCase() === String(observed.bundle).toLowerCase();
  const names = [identity?.displayName, identity?.executable, provider.name, provider.activation?.application, ...(provider.aliases || [])].map(norm).filter(Boolean);
  return names.some(name => name.localeCompare(norm(observed.name), undefined, {sensitivity:"accent"}) === 0);
}

function observeResolved(entry) {
  const processes = runningProcesses(processCandidates(entry.provider, entry.identity));
  const foreground = desktop.getForegroundApplication();
  const running = processes.length > 0;
  return {
    processes,
    running,
    active:running && sameForeground(entry.provider, entry.identity, foreground),
    foreground,
  };
}

function publicDescriptor(entry, observed) {
  return {
    name:entry.provider.name,
    providerId:entry.provider.id,
    available:providerAvailable(entry.provider),
    running:observed.running,
    active:observed.running && observed.active,
    bundle:entry.identity?.bundle || entry.provider?.identity?.bundle || null,
  };
}

async function list({availableOnly = false} = {}) {
  const applications = [];
  for (const provider of loadProviders().filter(item => item.kind === "application")) {
    const available = providerAvailable(provider);
    if (availableOnly && !available) continue;
    const exactPath = providerResolvedPath(provider);
    const resolved = desktop.resolveApplication({provider, exactPath});
    if (!resolved?.ok || !resolved.identity) {
      applications.push({name:provider.name, providerId:provider.id, available, running:false, active:false, bundle:provider?.identity?.bundle || null});
      continue;
    }
    const entry = {provider, exactPath, resolved, identity:resolved.identity};
    applications.push(publicDescriptor(entry, observeResolved(entry)));
  }
  applications.sort((a,b) => a.name.localeCompare(b.name));
  return {state:"OBSERVED", applications, observation:{method:"provider-registry-plus-process-and-foreground-observation"}, backend:{name:"macos-ax",strategy:"provider-scoped-application-inventory"}};
}

async function launch({application, timeoutMs = DEFAULT_TIMEOUT_MS}) {
  const entry = resolveProvider(application);
  if (!providerAvailable(entry.provider)) throw new ComputerControlError("PROVIDER_UNAVAILABLE", `Application Provider "${entry.provider.name}" is not installed at a registered path`, "NONE", {state:"FAILED"});
  const before = observeResolved(entry);
  if (before.running) return {ok:true,state:"APPLICATION_RUNNING",verified:true,application:publicDescriptor(entry,before),changed:false,idempotent:true,verification:{method:"process-observation",evidence:{running:true,idempotent:true}},backend:{name:"macos-ax",strategy:"idempotent-running-application",fallback:false}};
  const launched = desktop.launchApplication(entry.resolved);
  if (!launched?.ok) throw new ComputerControlError("APP_LAUNCH_FAILED", (launched?.stderr || launched?.stdout || launched?.detail || `Could not launch "${entry.provider.name}"`).trim(), "NONE", {state:"FAILED",method:launched?.method});
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const observed = observeResolved(entry);
    if (observed.running) return {ok:true,state:"APPLICATION_RUNNING",verified:true,application:publicDescriptor(entry,observed),changed:true,idempotent:false,verification:{method:"process-postcondition",evidence:{running:true}},backend:{name:"macos-ax",strategy:launched.method || "desktop-plugin-launch",fallback:false}};
    await sleep(POLL_MS);
  }
  throw new ComputerControlError("APP_LAUNCH_UNVERIFIED", `Application "${entry.provider.name}" did not become observable as running`, "NONE", {state:"UNVERIFIED"});
}

async function activate({application, timeoutMs = DEFAULT_TIMEOUT_MS}) {
  const entry = resolveProvider(application);
  const before = observeResolved(entry);
  if (!before.running) throw new ComputerControlError("APP_NOT_RUNNING", `Application "${entry.provider.name}" is not running; application.activate does not launch implicitly`, "NONE", {state:"FAILED"});
  if (before.active) return {ok:true,state:"APPLICATION_ACTIVE",verified:true,application:publicDescriptor(entry,before),changed:false,idempotent:true,verification:{method:"foreground-observation",evidence:{active:true,idempotent:true}},backend:{name:"macos-ax",strategy:"idempotent-foreground-application",fallback:false}};
  const activated = desktop.activateApplication(entry.resolved);
  if (!activated?.ok) throw new ComputerControlError("APP_ACTIVATE_FAILED", (activated?.stderr || activated?.stdout || activated?.detail || `Could not activate "${entry.provider.name}"`).trim(), "NONE", {state:"FAILED",method:activated?.method});
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const observed = observeResolved(entry);
    if (observed.active) return {ok:true,state:"APPLICATION_ACTIVE",verified:true,application:publicDescriptor(entry,observed),changed:true,idempotent:false,verification:{method:"foreground-postcondition",evidence:{active:true}},backend:{name:"macos-ax",strategy:activated.method || "desktop-plugin-activate",fallback:false}};
    await sleep(POLL_MS);
  }
  throw new ComputerControlError("APP_ACTIVATE_UNVERIFIED", `Application "${entry.provider.name}" did not become the observed foreground application`, "NONE", {state:"UNVERIFIED"});
}

async function terminate({application, timeoutMs = DEFAULT_TIMEOUT_MS}) {
  const entry = resolveProvider(application);
  const before = observeResolved(entry);
  if (!before.running) return {ok:true,state:"APPLICATION_TERMINATED",verified:true,application:publicDescriptor(entry,before),changed:false,idempotent:true,verification:{method:"process-observation",evidence:{running:false,idempotent:true}},backend:{name:"macos-ax",strategy:"idempotent-not-running-application",fallback:false}};

  const bundle = norm(entry.identity?.bundle || entry.provider?.identity?.bundle);
  if (!bundle) throw new ComputerControlError("APP_TERMINATE_IDENTITY_UNAVAILABLE", `Application "${entry.provider.name}" has no resolved macOS bundle identity for safe graceful termination`, "NONE", {state:"FAILED"});

  const requested = termination.request({bundle});
  if (!requested?.ok) throw new ComputerControlError(requested?.error || "APP_TERMINATE_REQUEST_FAILED", requested?.detail || `Could not request graceful termination for "${entry.provider.name}"`, "NONE", {state:requested?.state || "FAILED",method:requested?.method,accepted:requested?.accepted===true,matched:requested?.matched ?? null});

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const observed = observeResolved(entry);
    if (!observed.running) return {ok:true,state:"APPLICATION_TERMINATED",verified:true,application:publicDescriptor(entry,observed),changed:true,idempotent:false,verification:{method:"process-postcondition",evidence:{running:false,gracefulRequestAccepted:true}},backend:{name:"macos-ax",strategy:requested.method || "NSRunningApplication.terminate",fallback:false},diagnostics:{helperCompiled:requested.compiled===true,matched:requested.matched}};
    await sleep(POLL_MS);
  }

  const after = observeResolved(entry);
  throw new ComputerControlError("APP_TERMINATION_NOT_COMPLETED", `Application "${entry.provider.name}" remained running after a graceful termination request; Computer Control will not force-terminate it or answer any application dialog automatically`, "NONE", {state:"FAILED",running:after.running,active:after.active,gracefulRequestAccepted:true,method:requested.method});
}

module.exports = {list, launch, activate, terminate, processCandidates, runningProcesses, resolveProvider, sameForeground, observeResolved, publicDescriptor};
