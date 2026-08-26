"use strict";

const operations=require("./operations");
const stateful=require("./stateful-controls");
const DISCLOSURE_ROLES=new Set(["button","combo-box","menu","tree-item","list-item","row","group"]);

function mutate({app,element,expected,settle=true}) {
  const started=performance.now();
  const initial=operations.describe({app,element});
  const operation=expected?"expand":"collapse";
  const rejected=stateful.gate(initial,DISCLOSURE_ROLES,operation,started);
  if(rejected)return rejected;
  if(initial.expanded===null)return stateful.fail("CONTROL_STATE_UNAVAILABLE",`Cannot observe expanded state for ${initial.role} ${initial.ref}`,initial,started,"accessibility-expanded-gate");
  const previousValue=initial.expanded;
  if(previousValue===expected)return {ok:true,state:expected?"EXPANDED":"COLLAPSED",verified:true,ref:initial.ref,role:initial.role,name:initial.name,previousValue,observedValue:expected,changed:false,idempotent:true,method:"idempotent-observed-state",fallbackUsed:false,verificationMethod:"accessibility-expanded-postcondition",actionSeconds:0,observeSeconds:initial.observeSeconds||0,totalSeconds:(performance.now()-started)/1000};
  const state=expected?"EXPANDED":"COLLAPSED";
  const result=stateful.performAndVerify({app,description:initial,expected,field:"expanded",state,settle,started});
  return result.ok?{...result,previousValue,changed:true,idempotent:false}:result;
}
const expand=params=>mutate({...params,expected:true});
const collapse=params=>mutate({...params,expected:false});
module.exports={expand,collapse};
