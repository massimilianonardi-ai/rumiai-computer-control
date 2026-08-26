export * from "./index-stateful";
import type {
  ControlDescription as BaseControlDescription,
  InvokeResult as BaseInvokeResult,
  ToggleResult as BaseToggleResult,
  SelectResult as BaseSelectResult,
  ObservedTarget,
  VerifiedOperationResult
} from "./index-stateful";

// Keep the established public declarations directly visible in the package entrypoint.
export interface ControlDescription extends BaseControlDescription {}
export interface InvokeResult extends BaseInvokeResult {}
export interface ToggleResult extends BaseToggleResult {}
export interface SelectResult extends BaseSelectResult {}

export interface DisclosureResult extends VerifiedOperationResult {
  state: "EXPANDED" | "COLLAPSED";
  target: ObservedTarget;
  previousValue: boolean;
  observedValue: boolean;
  changed: boolean;
  idempotent: boolean;
}

export interface ValueMutationResult extends VerifiedOperationResult {
  state: "VALUE_SET" | "INCREMENTED" | "DECREMENTED";
  target: ObservedTarget;
  previousValue: string | number;
  observedValue: string | number;
  changed: boolean;
  idempotent: boolean;
  requestedValue?: string | number;
}

declare module "./index-stateful" {
  interface ComputerControlClient {
    expand(params: {application: string; target: ObservedTarget; settle?: boolean}): Promise<DisclosureResult>;
    collapse(params: {application: string; target: ObservedTarget; settle?: boolean}): Promise<DisclosureResult>;
    setValue(params: {application: string; target: ObservedTarget; value: string | number; settle?: boolean}): Promise<ValueMutationResult>;
    increment(params: {application: string; target: ObservedTarget; settle?: boolean}): Promise<ValueMutationResult>;
    decrement(params: {application: string; target: ObservedTarget; settle?: boolean}): Promise<ValueMutationResult>;
  }
}
