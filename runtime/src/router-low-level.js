"use strict";
const prior=require("./router");
const {ComputerControlError}=require("./errors");

function validatePointerCoordinates(params,method,allowed){
  if(!params||typeof params!=="object"||Array.isArray(params))throw new ComputerControlError("INVALID_POINTER_PARAMS",`${method} requires display, x and y`,"NONE");
  for(const key of Object.keys(params))if(!allowed.includes(key))throw new ComputerControlError("INVALID_POINTER_PARAMS",`${method} received unsupported parameter ${key}`,"NONE");
  if(params.display!=="primary")throw new ComputerControlError("POINTER_DISPLAY_UNSUPPORTED",`${method} currently supports only display=primary`,"NONE");
  for(const key of["x","y"])if(typeof params[key]!=="number"||!Number.isFinite(params[key])||params[key]<0)throw new ComputerControlError("POINTER_COORDINATE_INVALID",`${method} requires finite non-negative ${key}`,"NONE");
}

function createRouter(backend){
  const routePrior=prior.createRouter(backend);
  return async function route(method,params={}){
    switch(method){
      case"pointer.move":
        validatePointerCoordinates(params,method,["display","x","y"]);
        return backend.movePointer({display:params.display,x:params.x,y:params.y});
      case"pointer.click":
        validatePointerCoordinates(params,method,["display","x","y","button"]);
        if(params.button!=="left"&&params.button!=="right")throw new ComputerControlError("POINTER_BUTTON_UNSUPPORTED","pointer.click supports only button=left or button=right","NONE");
        return backend.clickPointer({display:params.display,x:params.x,y:params.y,button:params.button});
      default:return routePrior(method,params);
    }
  };
}
module.exports={...prior,createRouter,validatePointerCoordinates};
