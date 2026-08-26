"use strict";
const core=require("./index-core"); const stateful=require("./stateful-controls"); const disclosure=require("./disclosure-controls"); const value=require("./value-controls");
module.exports={...core,toggle:stateful.toggle,select:stateful.select,expand:disclosure.expand,collapse:disclosure.collapse,setValue:value.setValue,increment:value.increment,decrement:value.decrement};
