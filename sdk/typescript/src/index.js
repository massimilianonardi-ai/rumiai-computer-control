"use strict";
const core=require("./index-core");
class ComputerControlClient extends core.ComputerControlClient {
  describe({application, target}) { return this.call("ui.describe", {application, target}); }
  invoke({application, target, settle = true}) { return this.call("ui.invoke", {application, target, settle}); }
  toggle({application, target, value, settle = true}) { return this.call("ui.toggle", {application, target, value, settle}); }
  select({application, target, settle = true}) { return this.call("ui.select", {application, target, settle}); }
  expand({application, target, settle = true}) { return this.call("ui.expand", {application, target, settle}); }
  collapse({application, target, settle = true}) { return this.call("ui.collapse", {application, target, settle}); }
  setValue({application, target, value, settle = true}) { return this.call("ui.setValue", {application, target, value, settle}); }
  increment({application, target, settle = true}) { return this.call("ui.increment", {application, target, settle}); }
  decrement({application, target, settle = true}) { return this.call("ui.decrement", {application, target, settle}); }
  children({application, target, offset = 0, limit = 50}) { return this.call("ui.children", {application, target, offset, limit}); }
  scroll({application, target, direction, amount = 1, settle = true}) { return this.call("ui.scroll", {application, target, direction, amount, settle}); }
  scrollIntoView({application, target}) { return this.call("ui.scrollIntoView", {application, target}); }
}
module.exports={...core,ComputerControlClient};
