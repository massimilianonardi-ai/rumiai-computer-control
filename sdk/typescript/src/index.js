"use strict";

const core = require("./index-core");

class ComputerControlClient extends core.ComputerControlClient {
  describe({application, target}) {
    return this.call("ui.describe", {application, target});
  }

  invoke({application, target, settle = true}) {
    return this.call("ui.invoke", {application, target, settle});
  }

  toggle({application, target, value, settle = true}) {
    return this.call("ui.toggle", {application, target, value, settle});
  }

  select({application, target, settle = true}) {
    return this.call("ui.select", {application, target, settle});
  }
}

module.exports = {...core, ComputerControlClient};
