export * from "./index-stateful";
import type {ObservedTarget, VerifiedOperationResult} from "./index-stateful";

export interface DisclosureResult extends VerifiedOperationResult {
  state: "EXPANDED" | "COLLAPSED";
  target: ObservedTarget;
  previousValue: boolean;
  observedValue: boolean;
  changed: boolean;
  idempotent: boolean;
}

declare module "./index-stateful" {
  interface ComputerControlClient {
    expand(params: {application: string; target: ObservedTarget; settle?: boolean}): Promise<DisclosureResult>;
    collapse(params: {application: string; target: ObservedTarget; settle?: boolean}): Promise<DisclosureResult>;
  }
}
