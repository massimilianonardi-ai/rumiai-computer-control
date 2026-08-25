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
  call(method: string, params?: Record<string, unknown>): Promise<unknown>;
}
