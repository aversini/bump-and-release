#!/usr/bin/env node

const path = require("path");
const _ = require("lodash");
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
    "dry-run": {
      describe: "Do not run the commands",
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

const config = _.mergeWith(defaults, customCfg, (def, cust, key) => {
  if (key === "nextPossible") {
    return _.orderBy(
      _.values(_.merge(_.keyBy(def, "type"), _.keyBy(cust, "type"))),
      ["pos"]
    );
  }
});

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
