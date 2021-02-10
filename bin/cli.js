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
    config: {
      alias: "c",
      describe: "Configuration file",
    },
    "dry-run": {
      describe: "Do not run the commands",
    },
    type: {
      alias: "t",
      choices: ["bump", "release"],
      describe: "Type of action",
    },
  })
  .hide("version").argv;

let customCfg;

try {
  // trying user config at the root of the user package
  customCfg = require(path.join(process.cwd(), ".bump-and-release.config.js"));
} catch (e) {
  // nothing to declare officer
}

try {
  if (yargs.config) {
    // trying user provided config from the CLI
    customCfg = require(path.join(process.cwd(), yargs.config));
  }
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
