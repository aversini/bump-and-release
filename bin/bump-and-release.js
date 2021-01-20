#!/usr/bin/env node

const bump = require("../src/bump");
const release = require("../src/release");

const yargs = require("yargs")
  .options({
    type: {
      alias: "t",
      describe: "Type of action",
      choices: ["bump", "release"],
    },
  })
  .hide("version").argv;

switch (yargs.type) {
  case "bump":
    bump();
    break;

  case "release":
    release();
    break;

  default:
    break;
}
