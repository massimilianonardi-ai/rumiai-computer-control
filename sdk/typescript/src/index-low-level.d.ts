export * from "./index";
import "./index";

export type PointerButton = "left"|"right";
export interface PointerPosition {x:number;y:number;}
export interface PointerMoveResult {
  state:"MOVED";
  verified:true;
  display:"primary";
  position:PointerPosition;
  changed:boolean;
  idempotent:boolean;
  verification:{method:"quartz-current-pointer-location";evidence:{display:"primary";x:number;y:number}};
  backend:{name:"macos-quartz";strategy:"primary-display-pointer-move";fallback:true};
  diagnostics?:Record<string,unknown>;
}
export interface PointerClickResult {
  state:"CLICK_POSTED";
  display:"primary";
  position:PointerPosition;
  button:PointerButton;
  positionVerified:true;
  buttonDelivery:"POSTED";
  semanticConsequenceVerified:false;
  verification:{positionMethod:"quartz-current-pointer-location";buttonMethod:"quartz-event-post-only"};
  backend:{name:"macos-quartz";strategy:"primary-display-pointer-click-post";fallback:true};
  diagnostics?:Record<string,unknown>;
}

declare module "./index-stateful" {
  interface ComputerControlClient {
    movePointer(params:{display:"primary";x:number;y:number}):Promise<PointerMoveResult>;
    clickPointer(params:{display:"primary";x:number;y:number;button:PointerButton}):Promise<PointerClickResult>;
  }
}
