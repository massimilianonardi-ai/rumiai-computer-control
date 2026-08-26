"use strict";

const core = require("./index-core");
const stateful = require("./stateful-controls");

module.exports = {
  ...core,
  toggle:stateful.toggle,
  select:stateful.select,
};
