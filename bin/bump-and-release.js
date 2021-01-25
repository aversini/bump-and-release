#!/usr/bin/env node

const path = require("path");
const bump = require("../src/bump");
const release = require("../src/release");
const defaults = require("../src/defaults");
const {
  displayErrorMessages,
  mergeConfigurations,
} = require("../src/utilities");

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
    "dry-run": {
      describe: "Do not run the commands",
    },
  })
  .hide("version").argv;

let customCfg;

try {
  customCfg = yargs.config
    ? require(path.join(process.cwd(), yargs.config))
    : {};
} catch (e) {
  displayErrorMessages([`Unable to read config file ${yargs.config}`, e]);
}

/**
 * Merging default configuration with the
 * preferences shared by the user.
 */
const config = mergeConfigurations(defaults, customCfg);

if (yargs["dry-run"]) {
  global["dry-run"] = true;
}

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
