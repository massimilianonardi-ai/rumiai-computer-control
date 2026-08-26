"use strict";

const core = require("./index-core");

class ComputerControlClient extends core.ComputerControlClient {
  toggle({application, target, value, settle = true}) {
    return this.call("ui.toggle", {application, target, value, settle});
  }

  select({application, target, settle = true}) {
    return this.call("ui.select", {application, target, settle});
  }
}

module.exports = {...core, ComputerControlClient};
