export type ValidationState =
  | "PROPOSED"
  | "IMPLEMENTED"
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

export type ControlRole =
  | "application" | "window" | "dialog" | "alert" | "group" | "generic" | "region"
  | "toolbar" | "toolbar-item" | "menu-bar" | "menu" | "menu-item" | "button" | "link"
  | "checkbox" | "switch" | "radio-button" | "combo-box" | "list"
  | "list-item" | "option" | "slider" | "spin-button" | "text-field"
  | "text-area" | "search-box" | "static-text" | "date" | "time" | "date-time"
  | "tab-list" | "tab" | "tree" | "tree-item" | "table" | "row"
  | "column" | "cell" | "header" | "scroll-area" | "progress-bar"
  | "image" | "separator" | "unknown";

export type InvokableControlRole = "button" | "link" | "menu-item" | "toolbar-item";
export type ToggleControlRole = "checkbox" | "switch";
export type SelectControlRole = "radio-button" | "tab" | "option" | "list-item" | "row";

export type ControlValueType = "null" | "string" | "number" | "boolean" | "date" | "time" | "date-time";

export type ControlAction =
  | "focus" | "click" | "set-text" | "clear" | "invoke" | "toggle"
  | "select" | "set-value" | "expand" | "collapse" | "increment"
  | "decrement" | "scroll" | "scroll-into-view";

export interface ControlRange {
  min: number;
  max: number;
  step: number | null;
  value: number;
}

export interface ControlDescription {
  state: "DESCRIBED";
  target: {ref: `@e${number}`; role: ControlRole; name: string};
  description: string | null;
  value: string | number | boolean | null;
  valueType: ControlValueType;
  visible: boolean | null;
  enabled: boolean | null;
  focused: boolean | null;
  selected: boolean | null;
  checked: boolean | null;
  mixed: boolean | null;
  expanded: boolean | null;
  readOnly: boolean | null;
  required: boolean | null;
  range: ControlRange | null;
  actions: ControlAction[] | null;
  childCount: number | null;
  parentRole: ControlRole | null;
  bounds: {x: number; y: number; width: number; height: number} | null;
  observation: {method: string};
  backend: {name: string; strategy: string};
  diagnostics?: Record<string, unknown>;
}

export interface InvokeResult extends VerifiedOperationResult {
  state: "INVOKED";
  target: {ref: `@e${number}`; role: InvokableControlRole; name: string};
  semanticConsequenceVerified: false;
}

export interface ToggleResult extends VerifiedOperationResult {
  state: "TOGGLED";
  target: {ref: `@e${number}`; role: ToggleControlRole; name: string};
  requestedValue: boolean;
  previousValue: boolean | null;
  observedValue: boolean;
  changed: boolean;
  idempotent: boolean;
}

export interface SelectResult extends VerifiedOperationResult {
  state: "SELECTED";
  target: {ref: `@e${number}`; role: SelectControlRole; name: string};
  previousValue: boolean;
  observedValue: true;
  changed: boolean;
  idempotent: boolean;
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

export interface WindowDescriptor {
  id: string;
  title: string | null;
  process: string;
  pid: number;
  bundle: string | null;
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
  snapshot(params: {application: string; settle?: boolean; compact?: boolean; previousSnapshot?: string | null}): Promise<SnapshotResult>;
  describe(params: {application: string; target: {ref: `@e${number}`; role?: string; name?: string}}): Promise<ControlDescription>;
  invoke(params: {application: string; target: {ref: `@e${number}`; role?: string; name?: string}; settle?: boolean}): Promise<InvokeResult>;
  toggle(params: {application: string; target: {ref: `@e${number}`; role?: string; name?: string}; value: boolean; settle?: boolean}): Promise<ToggleResult>;
  select(params: {application: string; target: {ref: `@e${number}`; role?: string; name?: string}; settle?: boolean}): Promise<SelectResult>;
  find(params: FindParams): Promise<FindResult>;
  get(params: {application: string; target: ObservedTarget; property: string}): Promise<{state: "OBSERVED"; target: ObservedTarget; property: string; value: unknown}>;
  getBounds(params: {application: string; target: ObservedTarget}): Promise<{state: "OBSERVED"; target: ObservedTarget; bounds: {x: number; y: number; width: number; height: number}}>;
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
  listWindows(application: string): Promise<{state: "OBSERVED"; windows: WindowDescriptor[]}>;
  getCurrentWindow(application: string): Promise<{state: "OBSERVED"; window: WindowDescriptor}>;
  focusWindow(application: string, window: WindowDescriptor): Promise<VerifiedOperationResult>;
  closeWindow(application: string): Promise<VerifiedOperationResult>;
  minimizeWindow(application: string, window: WindowDescriptor): Promise<VerifiedOperationResult>;
  restoreWindow(application: string, window: WindowDescriptor): Promise<VerifiedOperationResult>;
  maximizeWindow(application: string, window: WindowDescriptor): Promise<VerifiedOperationResult>;
  moveWindow(application: string, window: WindowDescriptor, position: {x: number; y: number}): Promise<VerifiedOperationResult>;
  resizeWindow(application: string, window: WindowDescriptor, size: {width: number; height: number}): Promise<VerifiedOperationResult>;
  call(method: string, params?: Record<string, unknown>): Promise<unknown>;
}
