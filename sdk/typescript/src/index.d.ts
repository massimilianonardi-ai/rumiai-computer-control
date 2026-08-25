export type ValidationState =
  | "PROPOSED"
  | "BOUNDARY_PASS"
  | "PHYSICALLY_VALIDATED"
  | "PROMOTED"
  | "RELEASED";

export interface Capability {
  name: string;
  available: boolean;
  validationState: ValidationState;
  strategies?: string[];
}

export interface RuntimeInfo {
  contractVersion: string;
  runtimeVersion: string;
  backend: {name: string; version: string};
  platform: {os: "macos" | "windows" | "linux"; version: string; architecture: string};
  capabilities: Capability[];
}

export interface VerifiedOperationResult {
  ok: true;
  state: string;
  verified: true;
  verification: {method: string; evidence?: unknown};
  backend: {name: string; strategy: string; fallback?: boolean};
  diagnostics?: Record<string, unknown>;
}

export interface SetTextParams {
  application: string;
  target: {ref: `@e${number}`; role?: string; name?: string};
  text: string;
}

export interface ObservedTarget {
  ref: `@e${number}`;
  role: string;
  name: string;
  disabled?: boolean;
}

export interface SnapshotResult {
  state: "OBSERVED";
  snapshot: string;
  nodes: ObservedTarget[];
  changed: boolean | null;
  observation: {method: string};
  backend: {name: string; strategy: string};
  diagnostics?: Record<string, unknown>;
}

export interface FindParams {
  application: string;
  query?: string;
  role?: string | null;
  first?: boolean;
  snapshot?: string | null;
}

export interface FindResult {
  state: "FOUND";
  query: string | null;
  role: string | null;
  target: ObservedTarget;
  targets: ObservedTarget[];
  source: "snapshot" | "backend";
  observation: {method: string};
  backend: {name: string; strategy: string};
}

export interface ComputerControlClientOptions {
  socketPath?: string;
  timeoutMs?: number;
}

export class ComputerControlClient {
  constructor(options?: ComputerControlClientOptions);
  runtimeInfo(): Promise<RuntimeInfo>;
  ensureReady(): Promise<VerifiedOperationResult>;
  ensureApplicationReady(params: {application: string; timeoutMs?: number}): Promise<VerifiedOperationResult & {application: {name: string}; snapshot: string}>;
  getForeground(): Promise<{state: "OBSERVED"; application: {name: string; bundle: string | null; pid: number | null}; observation: {method: string}}>;
  shutdownRuntime(): Promise<VerifiedOperationResult>;
  setText(params: SetTextParams): Promise<VerifiedOperationResult>;
  snapshot(params: {
    application: string;
    settle?: boolean;
    compact?: boolean;
    previousSnapshot?: string | null;
  }): Promise<SnapshotResult>;
  find(params: FindParams): Promise<FindResult>;
  get(params: {application: string; target: ObservedTarget; property: string}): Promise<{state: "OBSERVED"; target: ObservedTarget; property: string; value: unknown}>;
  getBounds(params: {application: string; target: ObservedTarget}): Promise<{state: "OBSERVED"; target: ObservedTarget; bounds: {x: number; y: number; w: number; h: number}}>;
  focus(params: {application: string; target: ObservedTarget}): Promise<VerifiedOperationResult>;
  click(params: {application: string; target: ObservedTarget; settle?: boolean}): Promise<VerifiedOperationResult>;
  press(params: {application: string; keys: string; settle?: boolean}): Promise<VerifiedOperationResult>;
  clear(params: {application: string; target: ObservedTarget}): Promise<VerifiedOperationResult>;
  readClipboard(): Promise<{state: "OBSERVED"; text: string; observation: {method: string}}>;
  writeClipboard(text: string): Promise<VerifiedOperationResult>;
  copy(): Promise<VerifiedOperationResult>;
  paste(): Promise<VerifiedOperationResult>;
  waitStable(params: {application: string; timeoutMs?: number; pollMs?: number}): Promise<{state: "STABLE"; snapshot: string; observation: {method: string}}>;
  waitUntilChanged(params: {application: string; previousSnapshot: string; timeoutMs?: number; pollMs?: number; compact?: boolean}): Promise<{state: "CHANGED"; changed: true; snapshot: string; observation: {method: string}}>;
  call(method: string, params?: Record<string, unknown>): Promise<unknown>;
}
