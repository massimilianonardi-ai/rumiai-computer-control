"use strict";
const prior=require("./backend");
const pointer=require("./runtime/app/computer-control/backends/macos-pointer");
const {ComputerControlError}=require("../../runtime/src/errors");

const PHASE10B=[
  {name:"pointer.move",available:true,validationState:"PHYSICALLY_VALIDATED",strategies:["quartz-primary-display-pointer-move","current-location-postcondition"]},
  {name:"pointer.click",available:true,validationState:"PHYSICALLY_VALIDATED",strategies:["quartz-primary-display-pointer-click-post","verified-position-before-button-post"]},
];
const PHASE10C=[
  {name:"pointer.drag",available:true,validationState:"PHYSICALLY_VALIDATED",strategies:["quartz-primary-display-pointer-drag-post","verified-source-before-drag-post","atomic-button-lifecycle"]},
];

function finiteCoordinate(value,field){const number=Number(value);if(!Number.isFinite(number)||number<0)throw new ComputerControlError("POINTER_INVALID_NATIVE_STATE",`Pointer helper returned invalid ${field}`,"NONE",{state:"FAILED"});return number;}
function pointFromNative(x,y,prefix){return{x:finiteCoordinate(x,`${prefix}.x`),y:finiteCoordinate(y,`${prefix}.y`)}};
function pointNear(a,b,tolerance=1){return Math.abs(a.x-b.x)<=tolerance&&Math.abs(a.y-b.y)<=tolerance;}

function createMacOSBackend(options={}){
  const base=prior.createMacOSBackend(options);
  return{
    ...base,
    async info(){
      const info=await base.info();
      const names=new Set(info.capabilities.map(capability=>capability.name));
      return{...info,capabilities:[...info.capabilities,...[...PHASE10B,...PHASE10C].filter(capability=>!names.has(capability.name))]};
    },
    async movePointer({display,x,y}){
      const native=pointer.move({display,x,y});
      if(!native?.ok)throw backendFailure(native,"POINTER_MOVE_FAILED");
      if(native.state!=="MOVED"||native.display!=="primary"||native.positionVerified!==true||native.method!=="quartz-primary-display-pointer-move"||native.changed===native.idempotent)throw new ComputerControlError("POINTER_INVALID_NATIVE_STATE","pointer.move returned inconsistent native state","NONE",{state:"UNVERIFIED"});
      const position={x:finiteCoordinate(native.x,"x"),y:finiteCoordinate(native.y,"y")};
      return{
        state:"MOVED",verified:true,display:"primary",position,
        changed:native.changed===true,idempotent:native.idempotent===true,
        verification:{method:"quartz-current-pointer-location",evidence:{display:"primary",...position}},
        backend:{name:"macos-quartz",strategy:"primary-display-pointer-move",fallback:true},
        diagnostics:{actionSeconds:native.seconds||0,helperCompiled:native.compiled===true},
      };
    },
    async clickPointer({display,x,y,button}){
      const native=pointer.click({display,x,y,button});
      if(!native?.ok)throw backendFailure(native,"POINTER_CLICK_FAILED");
      if(native.state!=="CLICK_POSTED"||native.display!=="primary"||native.positionVerified!==true||native.buttonDelivery!=="POSTED"||native.semanticConsequenceVerified!==false||native.method!=="quartz-primary-display-pointer-click-post"||native.button!==button)throw new ComputerControlError("POINTER_INVALID_NATIVE_STATE","pointer.click returned inconsistent native state","NONE",{state:"UNVERIFIED"});
      const position={x:finiteCoordinate(native.x,"x"),y:finiteCoordinate(native.y,"y")};
      return{
        state:"CLICK_POSTED",display:"primary",position,button,
        positionVerified:true,buttonDelivery:"POSTED",semanticConsequenceVerified:false,
        verification:{positionMethod:"quartz-current-pointer-location",buttonMethod:"quartz-event-post-only"},
        backend:{name:"macos-quartz",strategy:"primary-display-pointer-click-post",fallback:true},
        diagnostics:{actionSeconds:native.seconds||0,helperCompiled:native.compiled===true},
      };
    },
    async dragPointer({display,source,destination,button}){
      const native=pointer.drag({display,source,destination,button});
      if(!native?.ok)throw backendFailure(native,"POINTER_DRAG_FAILED");
      if(native.state!=="DRAG_POSTED"||native.display!=="primary"||native.sourcePositionVerified!==true||native.buttonLifecycle!=="POSTED"||native.dragDelivery!=="POSTED"||native.releasePosted!==true||native.emergencyReleasePosted!==false||native.semanticConsequenceVerified!==false||native.method!=="quartz-primary-display-pointer-drag-post"||native.button!=="left")throw new ComputerControlError("POINTER_INVALID_NATIVE_STATE","pointer.drag returned inconsistent native state","NONE",{state:"UNVERIFIED"});
      const sourcePoint=pointFromNative(native.sourceX,native.sourceY,"source");
      const destinationPoint=pointFromNative(native.destinationX,native.destinationY,"destination");
      if(!pointNear(sourcePoint,source)||!pointNear(destinationPoint,destination))throw new ComputerControlError("POINTER_INVALID_NATIVE_STATE","pointer.drag returned coordinates inconsistent with the canonical request","NONE",{state:"UNVERIFIED"});
      return{
        state:"DRAG_POSTED",display:"primary",source:sourcePoint,destination:destinationPoint,button:"left",
        sourcePositionVerified:true,buttonLifecycle:"POSTED",dragDelivery:"POSTED",releasePosted:true,
        semanticConsequenceVerified:false,
        verification:{sourcePositionMethod:"quartz-current-pointer-location",dragMethod:"quartz-event-post-only",releaseMethod:"quartz-left-mouse-up-post"},
        backend:{name:"macos-quartz",strategy:"primary-display-pointer-drag-post",fallback:true},
        diagnostics:{actionSeconds:native.seconds||0,helperCompiled:native.compiled===true},
      };
    },
  };
}

function backendFailure(result,fallbackCode){return new ComputerControlError(result?.error||fallbackCode,result?.detail||fallbackCode,"NONE",{state:result?.state||"FAILED",method:result?.method||"none"});}
module.exports={...prior,createMacOSBackend};
