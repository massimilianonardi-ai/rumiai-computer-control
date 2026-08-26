export * from "./index-stateful";
import type {ControlDescription as BaseControlDescription,InvokeResult as BaseInvokeResult,ToggleResult as BaseToggleResult,SelectResult as BaseSelectResult,ObservedTarget,VerifiedOperationResult} from "./index-stateful";
export interface ControlDescription extends BaseControlDescription {}
export interface InvokeResult extends BaseInvokeResult {}
export interface ToggleResult extends BaseToggleResult {}
export interface SelectResult extends BaseSelectResult {}
export interface DisclosureResult extends VerifiedOperationResult {state:"EXPANDED"|"COLLAPSED";target:ObservedTarget;previousValue:boolean;observedValue:boolean;changed:boolean;idempotent:boolean;}
export interface ValueMutationResult extends VerifiedOperationResult {state:"VALUE_SET"|"INCREMENTED"|"DECREMENTED";target:ObservedTarget;previousValue:string|number;observedValue:string|number;changed:boolean;idempotent:boolean;requestedValue?:string|number;}
export interface ChildrenResult {state:"OBSERVED";target:ObservedTarget;children:ObservedTarget[];total:number;offset:number;limit:number;hasMore:boolean;observation:{method:string};backend:{name:string;strategy:string};}
declare module "./index-stateful" {interface ComputerControlClient {expand(params:{application:string;target:ObservedTarget;settle?:boolean}):Promise<DisclosureResult>;collapse(params:{application:string;target:ObservedTarget;settle?:boolean}):Promise<DisclosureResult>;setValue(params:{application:string;target:ObservedTarget;value:string|number;settle?:boolean}):Promise<ValueMutationResult>;increment(params:{application:string;target:ObservedTarget;settle?:boolean}):Promise<ValueMutationResult>;decrement(params:{application:string;target:ObservedTarget;settle?:boolean}):Promise<ValueMutationResult>;children(params:{application:string;target:ObservedTarget;offset?:number;limit?:number}):Promise<ChildrenResult>;}}
