"use strict";
const core=require("./index-core");
class ComputerControlClient extends core.ComputerControlClient {
  describe({application, target}) { return this.call("ui.describe", {application, target}); }
  getTextSelection({application, target}) { return this.call("ui.getTextSelection", {application, target}); }
  selectTextRange({application, target, range}) { return this.call("ui.selectTextRange", {application, target, range}); }
  replaceTextRange({application, target, range, text}) { return this.call("ui.replaceTextRange", {application, target, range, text}); }
  insertText({application, target, text}) { return this.call("ui.insertText", {application, target, text}); }
  appendText({application, target, text}) { return this.call("ui.appendText", {application, target, text}); }
  invoke({application, target, settle = true}) { return this.call("ui.invoke", {application, target, settle}); }
  toggle({application, target, value, settle = true}) { return this.call("ui.toggle", {application, target, value, settle}); }
  select({application, target, settle = true}) { return this.call("ui.select", {application, target, settle}); }
  expand({application, target, settle = true}) { return this.call("ui.expand", {application, target, settle}); }
  collapse({application, target, settle = true}) { return this.call("ui.collapse", {application, target, settle}); }
  setValue({application, target, value, settle = true}) { return this.call("ui.setValue", {application, target, value, settle}); }
  increment({application, target, settle = true}) { return this.call("ui.increment", {application, target, settle}); }
  decrement({application, target, settle = true}) { return this.call("ui.decrement", {application, target, settle}); }
  children({application, target, role = null, depth = 1, offset = 0, limit = 50}) { return this.call("ui.children", {application, target, role, depth, offset, limit}); }
  scroll({application, target, direction, amount = 1, settle = true}) { return this.call("ui.scroll", {application, target, direction, amount, settle}); }
  scrollIntoView({application, target}) { return this.call("ui.scrollIntoView", {application, target}); }
}
module.exports={...core,ComputerControlClient};
