#!/usr/bin/env node

const path = require("path");
const meow = require("meow");
const {
  displayErrorMessages,
  meowOptionsHelper,
  meowParserHelper,
} = require("teeny-js-utilities");

const PrettyError = require("pretty-error");
const pe = new PrettyError();
// Automatically prettifying all exceptions that are logged
pe.start();

const bump = require("../src/bump");
const release = require("../src/release");
const defaults = require("../src/defaults");
const { mergeConfigurations } = require("../src/utilities");

const { helpText, options } = meowOptionsHelper({
  flags: {
    config: {
      alias: "c",
      description: "Configuration file",
      type: "string",
    },
    dryRun: {
      description: "Do not actually run the commands",
      type: "boolean",
    },
    help: {
      alias: "h",
      description: "Display help instructions",
      type: "boolean",
    },
    type: {
      alias: "t",
      description: "Action to run: (bump) or (release)",
      isRequired: (flags) => !flags.help && !flags.version,
      type: "string",
    },
    version: {
      alias: "v",
      description: "Output the current version",
      type: "boolean",
    },
  },
  usage: true,
});
const cli = meow(helpText, options);
meowParserHelper({
  cli,
  restrictions: [
    {
      exit: 1,
      message: (x) =>
        `Error: option '-t, --type <string>' argument '${x.type}' is invalid. Valid options are "bump" or "release".`,
      test: (x) =>
        typeof x.type === "string" && x.type !== "bump" && x.type !== "release",
    },
  ],
});

let customCfg;

try {
  // trying user config at the root of the user package
  customCfg = require(path.join(process.cwd(), ".bump-and-release.config.js"));
} catch (e) {
  // nothing to declare officer
}

try {
  if (cli.flags.config) {
    // trying user provided config from the CLI
    customCfg = require(path.join(process.cwd(), cli.flags.config));
  }
} catch (e) {
  displayErrorMessages([`Unable to read config file ${cli.flags.config}`]);
}

/**
 * Merging default configuration with the
 * preferences shared by the user.
 */
const config = mergeConfigurations(defaults, customCfg);

if (cli.flags.dryRun) {
  global["dry-run"] = true;
}

switch (cli.flags.type) {
  case "bump":
    bump(config);
    break;

  case "release":
    release(config);
    break;

  default:
    break;
}
