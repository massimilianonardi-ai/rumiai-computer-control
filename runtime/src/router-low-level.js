"use strict";
const prior=require("./router");
const {ComputerControlError}=require("./errors");

function validatePointerCoordinates(params,method,allowed){
  if(!params||typeof params!=="object"||Array.isArray(params))throw new ComputerControlError("INVALID_POINTER_PARAMS",`${method} requires display, x and y`,"NONE");
  for(const key of Object.keys(params))if(!allowed.includes(key))throw new ComputerControlError("INVALID_POINTER_PARAMS",`${method} received unsupported parameter ${key}`,"NONE");
  if(params.display!=="primary")throw new ComputerControlError("POINTER_DISPLAY_UNSUPPORTED",`${method} currently supports only display=primary`,"NONE");
  for(const key of["x","y"])if(typeof params[key]!=="number"||!Number.isFinite(params[key])||params[key]<0)throw new ComputerControlError("POINTER_COORDINATE_INVALID",`${method} requires finite non-negative ${key}`,"NONE");
}
function validatePoint(point,method,label){
  if(!point||typeof point!=="object"||Array.isArray(point)||Object.keys(point).some(key=>key!=="x"&&key!=="y"))throw new ComputerControlError("INVALID_POINTER_PARAMS",`${method} requires ${label}={x,y}`,"NONE");
  for(const key of["x","y"])if(typeof point[key]!=="number"||!Number.isFinite(point[key])||point[key]<0)throw new ComputerControlError("POINTER_COORDINATE_INVALID",`${method} requires finite non-negative ${label}.${key}`,"NONE");
}
function validateKeyboardPress(params){
  if(!params||typeof params!=="object"||Array.isArray(params)||Object.keys(params).some(key=>key!=="key"&&key!=="modifiers"))throw new ComputerControlError("INVALID_KEYBOARD_PARAMS","keyboard.press requires key and modifiers","NONE");
  if(!Array.isArray(params.modifiers))throw new ComputerControlError("INVALID_KEYBOARD_PARAMS","keyboard.press modifiers must be an array","NONE");
  const plainA=params.key==="a"&&params.modifiers.length===0;
  const shiftedA=params.key==="a"&&params.modifiers.length===1&&params.modifiers[0]==="shift";
  const enter=params.key==="enter"&&params.modifiers.length===0;
  if(!plainA&&!shiftedA&&!enter)throw new ComputerControlError("KEYBOARD_COMBINATION_UNSUPPORTED","keyboard.press supports only a, shift+a, and enter in Phase 10E","NONE");
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
      case"pointer.drag":
        if(!params||typeof params!=="object"||Array.isArray(params)||Object.keys(params).some(key=>!["display","source","destination","button"].includes(key)))throw new ComputerControlError("INVALID_POINTER_PARAMS","pointer.drag requires display, source, destination and button","NONE");
        if(params.display!=="primary")throw new ComputerControlError("POINTER_DISPLAY_UNSUPPORTED","pointer.drag currently supports only display=primary","NONE");
        if(params.button!=="left")throw new ComputerControlError("POINTER_BUTTON_UNSUPPORTED","pointer.drag currently supports only button=left","NONE");
        validatePoint(params.source,method,"source");validatePoint(params.destination,method,"destination");
        if(params.source.x===params.destination.x&&params.source.y===params.destination.y)throw new ComputerControlError("POINTER_DRAG_ZERO_DISTANCE","pointer.drag requires distinct source and destination coordinates","NONE");
        return backend.dragPointer({display:params.display,source:{...params.source},destination:{...params.destination},button:"left"});
      case"pointer.wheel":
        validatePointerCoordinates(params,method,["display","x","y","direction","amount"]);
        if(params.direction!=="up"&&params.direction!=="down")throw new ComputerControlError("POINTER_WHEEL_DIRECTION_UNSUPPORTED","pointer.wheel supports only direction=up or direction=down","NONE");
        if(!Number.isInteger(params.amount)||params.amount<1||params.amount>10)throw new ComputerControlError("POINTER_WHEEL_AMOUNT_INVALID","pointer.wheel amount must be an integer from 1 through 10","NONE");
        return backend.wheelPointer({display:params.display,x:params.x,y:params.y,direction:params.direction,amount:params.amount});
      case"keyboard.press":
        validateKeyboardPress(params);
        return backend.pressKey({key:params.key,modifiers:[...params.modifiers]});
      default:return routePrior(method,params);
    }
  };
}
module.exports={...prior,createRouter,validatePointerCoordinates,validatePoint,validateKeyboardPress};
