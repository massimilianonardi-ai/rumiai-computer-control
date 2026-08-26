export * from "./index-stateful";
import type {ControlDescription as BaseControlDescription,InvokeResult as BaseInvokeResult,ToggleResult as BaseToggleResult,SelectResult as BaseSelectResult,ObservedTarget,VerifiedOperationResult} from "./index-stateful";
export interface ControlDescription extends BaseControlDescription {}
export interface InvokeResult extends BaseInvokeResult {}
export interface ToggleResult extends BaseToggleResult {}
export interface SelectResult extends BaseSelectResult {}
export interface DisclosureResult extends VerifiedOperationResult {state:"EXPANDED"|"COLLAPSED";target:ObservedTarget;previousValue:boolean;observedValue:boolean;changed:boolean;idempotent:boolean;}
export interface ValueMutationResult extends VerifiedOperationResult {state:"VALUE_SET"|"INCREMENTED"|"DECREMENTED";target:ObservedTarget;previousValue:string|number;observedValue:string|number;changed:boolean;idempotent:boolean;requestedValue?:string|number;}
export interface StructuralTarget {ref:string;role?:string;name?:string;}
export interface StructuralChild extends StructuralTarget {role:string;name:string;disabled:boolean;depth:number;}
export interface ChildrenResult {state:"OBSERVED";target:StructuralTarget;children:StructuralChild[];total:number;offset:number;limit:number;hasMore:boolean;depth:number;role:string|null;observation:{method:string;rebound?:boolean};backend:{name:string;strategy:string};}
export interface ScrollResult extends VerifiedOperationResult {state:"SCROLLED";target:ObservedTarget;direction:"up"|"down";amount:number;}
export interface ScrollIntoViewResult extends VerifiedOperationResult {state:"VISIBLE";target:ObservedTarget;idempotent:boolean;changed:boolean;}
export type TextIndexUnit = "utf16-code-unit";
export interface TextRangeRequest {start:number;end:number;unit:TextIndexUnit;}
export interface TextSelectionRange {start:number;end:number;length:number;collapsed:boolean;unit:TextIndexUnit;}
export interface TextSelectionResult {state:"OBSERVED";target:ObservedTarget;selection:TextSelectionRange;caret:number|null;selectedText:string|null;textLength:number|null;observation:{method:string;reboundBy:"role-and-accessible-name";indexUnit:TextIndexUnit};backend:{name:string;strategy:string};diagnostics?:Record<string,unknown>;}
export interface TextRangeSelectionResult extends VerifiedOperationResult {state:"TEXT_RANGE_SELECTED";target:ObservedTarget;requestedRange:TextSelectionRange;previousRange:TextSelectionRange;observedRange:TextSelectionRange;caret:number|null;selectedText:string|null;changed:boolean;idempotent:boolean;}
declare module "./index-stateful" {interface ComputerControlClient {expand(params:{application:string;target:ObservedTarget;settle?:boolean}):Promise<DisclosureResult>;collapse(params:{application:string;target:ObservedTarget;settle?:boolean}):Promise<DisclosureResult>;setValue(params:{application:string;target:ObservedTarget;value:string|number;settle?:boolean}):Promise<ValueMutationResult>;increment(params:{application:string;target:ObservedTarget;settle?:boolean}):Promise<ValueMutationResult>;decrement(params:{application:string;target:ObservedTarget;settle?:boolean}):Promise<ValueMutationResult>;children(params:{application:string;target:StructuralTarget;role?:string|null;depth?:number;offset?:number;limit?:number}):Promise<ChildrenResult>;scroll(params:{application:string;target:ObservedTarget;direction:"up"|"down";amount?:number;settle?:boolean}):Promise<ScrollResult>;scrollIntoView(params:{application:string;target:ObservedTarget}):Promise<ScrollIntoViewResult>;getTextSelection(params:{application:string;target:ObservedTarget}):Promise<TextSelectionResult>;selectTextRange(params:{application:string;target:ObservedTarget;range:TextRangeRequest}):Promise<TextRangeSelectionResult>;}}
