"use strict";
const core=require("./router-core"); const {ComputerControlError}=require("./errors");
function createRouter(backend){const routeCore=core.createRouter(backend);return async function route(method,params={}){switch(method){
case "ui.toggle":core.validateElementParams(params,"ui.toggle");if(typeof params.value!=="boolean")throw new ComputerControlError("BOOLEAN_VALUE_REQUIRED","ui.toggle requires boolean value","NONE");return backend.toggle(params);
case "ui.select":core.validateElementParams(params,"ui.select");return backend.select(params);
case "ui.expand":core.validateElementParams(params,"ui.expand");return backend.expand(params);
case "ui.collapse":core.validateElementParams(params,"ui.collapse");return backend.collapse(params);
case "ui.setValue":core.validateElementParams(params,"ui.setValue");if(params.value===undefined||params.value===null||!(typeof params.value==="string"||typeof params.value==="number"))throw new ComputerControlError("CONTROL_VALUE_REQUIRED","ui.setValue requires a string or number value","NONE");return backend.setValue(params);
case "ui.increment":core.validateElementParams(params,"ui.increment");return backend.increment(params);
case "ui.decrement":core.validateElementParams(params,"ui.decrement");return backend.decrement(params);
case "ui.children":core.validateElementParams(params,"ui.children");if(params.offset!=null&&(!Number.isInteger(params.offset)||params.offset<0))throw new ComputerControlError("INVALID_PAGINATION","ui.children offset must be a non-negative integer","NONE");if(params.limit!=null&&(!Number.isInteger(params.limit)||params.limit<1||params.limit>200))throw new ComputerControlError("INVALID_PAGINATION","ui.children limit must be between 1 and 200","NONE");return backend.children(params);
default:return routeCore(method,params);}};}
module.exports={...core,createRouter};
