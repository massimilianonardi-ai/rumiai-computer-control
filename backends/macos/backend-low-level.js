"use strict";
const prior=require("./backend");
const pointer=require("./runtime/app/computer-control/backends/macos-pointer");
const {ComputerControlError}=require("../../runtime/src/errors");

const PHASE10B=[
  {name:"pointer.move",available:true,validationState:"IMPLEMENTED",strategies:["quartz-primary-display-pointer-move","current-location-postcondition"]},
  {name:"pointer.click",available:true,validationState:"IMPLEMENTED",strategies:["quartz-primary-display-pointer-click-post","verified-position-before-button-post"]},
];

function finiteCoordinate(value,field){const number=Number(value);if(!Number.isFinite(number)||number<0)throw new ComputerControlError("POINTER_INVALID_NATIVE_STATE",`Pointer helper returned invalid ${field}`,"NONE",{state:"FAILED"});return number;}

function createMacOSBackend(options={}){
  const base=prior.createMacOSBackend(options);
  return{
    ...base,
    async info(){
      const info=await base.info();
      const names=new Set(info.capabilities.map(capability=>capability.name));
      return{...info,capabilities:[...info.capabilities,...PHASE10B.filter(capability=>!names.has(capability.name))]};
    },
    async movePointer({display,x,y}){
      const native=pointer.move({display,x,y});
      if(!native?.ok)throw backendFailure(native,"POINTER_MOVE_FAILED");
      if(native.state!=="MOVED"||native.display!=="primary"||native.positionVerified!==true||native.method!=="quartz-primary-display-pointer-move")throw new ComputerControlError("POINTER_INVALID_NATIVE_STATE","pointer.move returned inconsistent native state","NONE",{state:"UNVERIFIED"});
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
  };
}

function backendFailure(result,fallbackCode){return new ComputerControlError(result?.error||fallbackCode,result?.detail||fallbackCode,"NONE",{state:result?.state||"FAILED",method:result?.method||"none"});}
module.exports={...prior,createMacOSBackend};
