"use strict";
const prior = require("./backend-structure");
const path = require("node:path");
const {ComputerControlError} = require("../../runtime/src/errors");
const textSelection = require("./runtime/app/computer-control/backends/macos-text-selection");
const textRangeSelection = require("./runtime/app/computer-control/backends/macos-text-range-selection");
const SCROLL_UNIT_POINTS = 240;
const TEXT_SELECTION_ROLES = new Set(["text-field","text-area","search-box"]);

function canonicalTextRange(start,end){return{start,end,length:end-start,collapsed:start===end,unit:"utf16-code-unit"};}
function sameTextRange(a,b){return Boolean(a&&b&&a.start===b.start&&a.end===b.end&&a.length===b.length&&a.collapsed===b.collapsed&&a.unit===b.unit);}

function createMacOSBackend(options = {}) {
  const base = prior.createMacOSBackend(options);
  let controlModule = null;
  function control() {
    if (controlModule) return controlModule;
    if (options.backendModule) return (controlModule = options.backendModule);
    return (controlModule = require(path.resolve(options.modulePath || prior.DEFAULT_MACOS_MODULE)));
  }
  function freshTree(application, settle = false) {
    const tree = control().snapshotTree({app:application, settle, depth:12});
    if (!tree.ok) throw new ComputerControlError(tree.error || "SNAPSHOT_FAILED", tree.detail || "native AX tree unavailable", "NONE");
    return tree;
  }
  function resolveInTree(tree, target) {
    const found = control().findTreeNode(tree.root, target);
    if (!found.ok) throw new ComputerControlError(found.error, found.detail, "NONE");
    return found;
  }
  function scrollContext(found) {
    const node = control().nearestScrollTreeAncestor(found);
    if (!node) throw new ComputerControlError("SCROLL_CONTEXT_UNAVAILABLE", "Target is not observed inside a native scroll-area", "NONE", {state:"UNVERIFIED"});
    return node;
  }
  function resolveTextProcess(application) {
    const provider = typeof control().resolveApplicationProvider === "function" ? control().resolveApplicationProvider(application) : null;
    if (!provider) throw new ComputerControlError("PROVIDER_NOT_FOUND",`No application Provider registered for "${application}"`,"NONE",{state:"FAILED"});
    const candidates=[provider?.identity?.process,provider?.activation?.application,provider?.name];
    const resolved=textSelection.resolvePid(candidates);
    if(!resolved.ok)throw new ComputerControlError(resolved.error||"TEXT_TARGET_PID_UNAVAILABLE",resolved.detail||"native process id unavailable","NONE",{state:"FAILED",method:resolved.method});
    return resolved;
  }
  function validateTextTarget(described,target,operation){
    const role=described?.target?.role||target?.role||"";
    const name=String(described?.target?.name||target?.name||"").trim();
    if(!TEXT_SELECTION_ROLES.has(role))throw new ComputerControlError("UNSUPPORTED_CONTROL_ROLE",`${operation} does not support role "${role}"`,"NONE",{state:"FAILED",role});
    if(!name)throw new ComputerControlError("TEXT_TARGET_UNNAMED",`${operation} requires an accessible name for safe native re-resolution`,"NONE",{state:"FAILED",role});
    return{role,name,target:{ref:described.target.ref,role,name}};
  }
  function observeTextSelection({application,target,operation}){
    return base.describe({application,target}).then(described=>{
      const resolvedTarget=validateTextTarget(described,target,operation);
      const process=resolveTextProcess(application);
      const observed=textSelection.observe({pid:process.pid,role:resolvedTarget.role,name:resolvedTarget.name});
      if(!observed?.ok)throw new ComputerControlError(observed?.error||"TEXT_SELECTION_OBSERVATION_FAILED",observed?.detail||"native text-selection observation failed","NONE",{state:observed?.state||"FAILED",method:observed?.method||"macos-ax-selected-text-range"});
      const range=observed.range;
      if(!range||!Number.isInteger(range.start)||!Number.isInteger(range.end)||!Number.isInteger(range.length)||range.start<0||range.end<range.start||range.length!==range.end-range.start||range.unit!=="utf16-code-unit")throw new ComputerControlError("TEXT_SELECTION_INVALID","Native backend returned an invalid canonical text range","NONE",{state:"FAILED"});
      if(observed.selectedText!=null&&String(observed.selectedText).length!==range.length)throw new ComputerControlError("TEXT_SELECTION_INCONSISTENT","Selected text UTF-16 length does not match observed range length","NONE",{state:"FAILED"});
      if(observed.textLength!=null&&(!Number.isInteger(observed.textLength)||observed.textLength<range.end))throw new ComputerControlError("TEXT_SELECTION_INVALID","Observed text length is inconsistent with selection range","NONE",{state:"FAILED"});
      return{described,...resolvedTarget,process,observed,range};
    });
  }

  return {
    ...base,
    async info() {
      const info = await base.info();
      const names = new Set(info.capabilities.map(x => x.name));
      const additions = [
        {name:"ui.scroll", available:true, validationState:"PHYSICALLY_VALIDATED", strategies:["target-aware-wheel", "native-scroll-tree-postcondition"]},
        {name:"ui.scrollIntoView", available:true, validationState:"PHYSICALLY_VALIDATED", strategies:["ax-scroll-to-visible", "scroll-area-geometry-postcondition"]},
        {name:"ui.getTextSelection", available:true, validationState:"PHYSICALLY_VALIDATED", strategies:["native-ax-selected-text-range", "semantic-descriptor-rebind"]},
        {name:"ui.selectTextRange", available:true, validationState:"PHYSICALLY_VALIDATED", strategies:["native-ax-selected-text-range-write", "exact-range-postcondition"]},
      ].filter(x => !names.has(x.name));
      return {...info, capabilities:[...info.capabilities, ...additions]};
    },
    async getTextSelection({application,target}) {
      const current=await observeTextSelection({application,target,operation:"ui.getTextSelection"});
      return {state:"OBSERVED",target:current.target,selection:current.range,caret:current.range.collapsed?current.range.start:null,selectedText:current.observed.selectedText,textLength:current.observed.textLength,observation:{method:current.observed.method||"macos-ax-selected-text-range",reboundBy:"role-and-accessible-name",indexUnit:"utf16-code-unit"},backend:{name:"macos-ax",strategy:"native-ax-selected-text-range"},diagnostics:{observeSeconds:(current.process.seconds||0)+(current.observed.seconds||0),helperCompiled:current.observed.compiled===true}};
    },
    async selectTextRange({application,target,range}) {
      const requested=canonicalTextRange(range.start,range.end);
      const before=await observeTextSelection({application,target,operation:"ui.selectTextRange"});
      if(before.observed.textLength!=null&&requested.end>before.observed.textLength)throw new ComputerControlError("TEXT_RANGE_OUT_OF_BOUNDS",`Requested end ${requested.end} exceeds observed UTF-16 text length ${before.observed.textLength}`,"NONE",{state:"FAILED",requestedRange:requested,textLength:before.observed.textLength});
      if(sameTextRange(before.range,requested))return{ok:true,state:"TEXT_RANGE_SELECTED",verified:true,target:before.target,requestedRange:requested,previousRange:before.range,observedRange:before.range,caret:requested.collapsed?requested.start:null,selectedText:before.observed.selectedText,changed:false,idempotent:true,verification:{method:"native-ax-selected-text-range-postcondition",evidence:{matches:true,idempotent:true}},backend:{name:"macos-ax",strategy:"idempotent-native-text-range",fallback:false},diagnostics:{actionSeconds:0,observeSeconds:(before.process.seconds||0)+(before.observed.seconds||0)}};
      const mutation=textRangeSelection.setRange({pid:before.process.pid,role:before.role,name:before.name,start:requested.start,end:requested.end});
      if(!mutation?.ok)throw new ComputerControlError(mutation?.error||"TEXT_RANGE_SELECTION_FAILED",mutation?.detail||"native text range selection failed","NONE",{state:mutation?.state||"FAILED",method:mutation?.method||"macos-ax-set-selected-text-range",requestedRange:requested});
      if(!sameTextRange(mutation.range,requested))throw new ComputerControlError("TEXT_RANGE_WRITE_UNVERIFIED","Native helper did not report the exact requested range after write","NONE",{state:"UNVERIFIED",requestedRange:requested,observedRange:mutation.range||null});
      const after=await observeTextSelection({application,target:before.target,operation:"ui.selectTextRange"});
      if(!sameTextRange(after.range,requested))throw new ComputerControlError("TEXT_RANGE_SELECTION_UNVERIFIED","Independent AX observation did not match requested text range","NONE",{state:"UNVERIFIED",requestedRange:requested,observedRange:after.range});
      return{ok:true,state:"TEXT_RANGE_SELECTED",verified:true,target:after.target,requestedRange:requested,previousRange:before.range,observedRange:after.range,caret:after.range.collapsed?after.range.start:null,selectedText:after.observed.selectedText,changed:true,idempotent:false,verification:{method:"native-ax-selected-text-range-postcondition",evidence:{matches:true,helperVerified:true,independentObservation:true}},backend:{name:"macos-ax",strategy:mutation.method||"macos-ax-set-selected-text-range",fallback:false},diagnostics:{actionSeconds:mutation.seconds||0,observeSeconds:(before.process.seconds||0)+(before.observed.seconds||0)+(after.process.seconds||0)+(after.observed.seconds||0),helperCompiled:mutation.compiled===true||after.observed.compiled===true}};
    },
    async scroll({application, target, direction, amount = 1, settle = true}) {
      const beforeTree = freshTree(application, false);
      const before = resolveInTree(beforeTree, target);
      const beforeContext = scrollContext(before);
      const beforeSignature = control().stableTreeSignature(beforeContext);
      const dy = (direction === "down" ? -1 : 1) * SCROLL_UNIT_POINTS * amount;
      const action = control().scrollElement(before.ref, 0, dy);
      if (!action?.ok) throw new ComputerControlError("SCROLL_ACTION_FAILED", (action?.stderr || action?.stdout || "target-aware scroll delivery failed").trim(), "NONE", {state:"FAILED", method:action?.method || "none"});
      if (settle && typeof base.waitStable === "function") await base.waitStable({application});
      const afterTree = freshTree(application, false);
      const after = resolveInTree(afterTree, {ref:before.ref, role:before.role, name:before.name});
      const afterContext = scrollContext(after);
      const afterSignature = control().stableTreeSignature(afterContext);
      if (beforeSignature === afterSignature) throw new ComputerControlError("SCROLL_UNVERIFIED", "Target-aware wheel delivery did not produce an observable change in the native scroll-area subtree", "NONE", {state:"UNVERIFIED", direction, amount});
      return {ok:true,state:"SCROLLED",verified:true,target:{ref:after.ref,role:after.role,name:after.name},direction,amount,verification:{method:"native-scroll-area-tree-changed",evidence:{changed:true,scrollUnitPoints:SCROLL_UNIT_POINTS}},backend:{name:"macos-ax",strategy:action.method||"target-aware-wheel",fallback:true},diagnostics:{actionSeconds:action.seconds||0}};
    },
    async scrollIntoView({application, target}) {
      const beforeTree = freshTree(application, false);
      const before = resolveInTree(beforeTree, target);
      const beforeContext = scrollContext(before);
      const beforeTargetBounds = control().treeRectangle(before.node);
      const beforeContextBounds = control().treeRectangle(beforeContext);
      if (beforeTargetBounds && beforeContextBounds && control().treeIntersects(beforeTargetBounds, beforeContextBounds)) {
        return {ok:true,state:"VISIBLE",verified:true,target:{ref:before.ref,role:before.role,name:before.name},idempotent:true,changed:false,verification:{method:"native-scroll-area-geometry",evidence:{intersects:true}},backend:{name:"macos-ax",strategy:"idempotent-native-geometry",fallback:false}};
      }
      const action = control().scrollIntoViewElement(before.ref);
      let actionSeconds=action?.seconds||0;
      let current=before;
      let currentContext=beforeContext;
      if (action?.ok) {
        const afterTree = freshTree(application, true);
        current = resolveInTree(afterTree, {ref:before.ref, role:before.role, name:before.name});
        currentContext = scrollContext(current);
        const targetBounds = control().treeRectangle(current.node);
        const contextBounds = control().treeRectangle(currentContext);
        if (targetBounds && contextBounds && control().treeIntersects(targetBounds, contextBounds)) return {ok:true,state:"VISIBLE",verified:true,target:{ref:current.ref,role:current.role,name:current.name},idempotent:false,changed:true,verification:{method:"ax-scroll-to-visible-plus-native-geometry",evidence:{intersects:true}},backend:{name:"macos-ax",strategy:action.method||"ax-scroll-to-visible",fallback:false},diagnostics:{actionSeconds}};
      }
      for (let attempt=1; attempt<=12; attempt+=1) {
        const targetBounds=control().treeRectangle(current.node);
        const contextBounds=control().treeRectangle(currentContext);
        const pivot=control().scrollTreePivotRef(currentContext,current);
        if(!targetBounds||!contextBounds||!pivot)break;
        const dy=targetBounds.y<contextBounds.y?SCROLL_UNIT_POINTS:-SCROLL_UNIT_POINTS;
        const wheel=control().scrollElement(pivot,0,dy);
        actionSeconds+=wheel?.seconds||0;
        if(!wheel?.ok)throw new ComputerControlError("SCROLL_INTO_VIEW_ACTION_FAILED",(wheel?.stderr||wheel?.stdout||"wheel fallback failed").trim(),"NONE",{state:"FAILED",method:wheel?.method||"none"});
        const nextTree=freshTree(application,true);
        current=resolveInTree(nextTree,{ref:before.ref,role:before.role,name:before.name});
        currentContext=scrollContext(current);
        const observedTarget=control().treeRectangle(current.node);
        const observedContext=control().treeRectangle(currentContext);
        if(observedTarget&&observedContext&&control().treeIntersects(observedTarget,observedContext))return{ok:true,state:"VISIBLE",verified:true,target:{ref:current.ref,role:current.role,name:current.name},idempotent:false,changed:true,verification:{method:"native-wheel-plus-geometry",evidence:{intersects:true,attempts:attempt}},backend:{name:"macos-ax",strategy:wheel.method||"target-aware-wheel",fallback:true},diagnostics:{actionSeconds}};
      }
      throw new ComputerControlError("SCROLL_INTO_VIEW_UNVERIFIED",`Native scroll did not bring the target into the observed viewport; AX action: ${(action?.stderr||action?.stdout||"unsupported").trim()}`,"NONE",{state:"UNVERIFIED"});
    },
  };
}
module.exports = {...prior, createMacOSBackend, SCROLL_UNIT_POINTS, TEXT_SELECTION_ROLES, canonicalTextRange, sameTextRange};
