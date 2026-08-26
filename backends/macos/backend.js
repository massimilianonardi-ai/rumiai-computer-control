"use strict";
const prior = require("./backend-structure");
const path = require("node:path");
const {ComputerControlError} = require("../../runtime/src/errors");
const SCROLL_UNIT_POINTS = 240;

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

  return {
    ...base,
    async info() {
      const info = await base.info();
      const names = new Set(info.capabilities.map(x => x.name));
      const additions = [
        {name:"ui.scroll", available:true, validationState:"IMPLEMENTED", strategies:["target-aware-wheel", "native-scroll-tree-postcondition"]},
        {name:"ui.scrollIntoView", available:true, validationState:"IMPLEMENTED", strategies:["ax-scroll-to-visible", "scroll-area-geometry-postcondition"]},
      ].filter(x => !names.has(x.name));
      return {...info, capabilities:[...info.capabilities, ...additions]};
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
module.exports = {...prior, createMacOSBackend, SCROLL_UNIT_POINTS};
