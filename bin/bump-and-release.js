#!/usr/bin/env node

const path = require("path");
const merge = require("lodash.merge");
const bump = require("../src/bump");
const release = require("../src/release");
const defaults = require("../src/defaults");

const yargs = require("yargs")
  .options({
    type: {
      alias: "t",
      describe: "Type of action",
      choices: ["bump", "release"],
    },
    config: {
      alias: "c",
      describe: "Configuration file",
    },
  })
  .hide("version").argv;

/**
 * Merging default configuration with the
 * preferences shared by the user.
 */
const customCfg = yargs.config
  ? require(path.join(process.cwd(), yargs.config))
  : {};
const config = merge(defaults, customCfg);

switch (yargs.type) {
  case "bump":
    bump(config);
    break;

  case "release":
    release(config);
    break;

  default:
    break;
}
