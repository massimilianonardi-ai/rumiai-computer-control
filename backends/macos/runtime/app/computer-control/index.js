"use strict";
const core = require("./index-core");
const stateful = require("./stateful-controls");
const disclosure = require("./disclosure-controls");
const value = require("./value-controls");
const nativeTree = require("./native-tree");
const agentCtrl = require("./backends/agent-ctrl");

module.exports = {
  ...core,
  toggle:stateful.toggle,
  select:stateful.select,
  expand:disclosure.expand,
  collapse:disclosure.collapse,
  setValue:value.setValue,
  increment:value.increment,
  decrement:value.decrement,
  snapshotTree:nativeTree.snapshotTree,
  findTreeNode:nativeTree.findNode,
  collectTreeDescendants:nativeTree.collectDescendants,
  treeRectangle:nativeTree.rectangle,
  nearestTreeAncestor:nativeTree.nearestAncestor,
  treeIntersects:nativeTree.intersects,
  stableTreeSignature:nativeTree.stableNodeSignature,
  scrollElement:agentCtrl.scrollElement,
  scrollIntoViewElement:agentCtrl.scrollIntoViewElement,
};
