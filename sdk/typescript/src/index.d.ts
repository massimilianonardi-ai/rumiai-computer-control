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
  shutdownRuntime(): Promise<VerifiedOperationResult>;
  setText(params: SetTextParams): Promise<VerifiedOperationResult>;
  snapshot(params: {
    application: string;
    settle?: boolean;
    compact?: boolean;
    previousSnapshot?: string | null;
  }): Promise<SnapshotResult>;
  find(params: FindParams): Promise<FindResult>;
  call(method: string, params?: Record<string, unknown>): Promise<unknown>;
}
