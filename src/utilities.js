const inquirer = require("inquirer");
const kleur = require("kleur");
const ora = require("ora");
const { promisify } = require("util");
const { exec } = require("child_process");

const ALLOWED_BRANCHES = ["master"];

const startSpinner = (msg) => ora(msg).start();

const displayConfirmation = async (msg) => {
  const questions = {
    type: "confirm",
    name: "goodToGo",
    message: "Do you want to continue?",
    default: true,
  };

  /* eslint-disable no-console */
  console.log();
  console.log(msg);
  console.log();
  /* eslint-enable */

  const answers = await inquirer.prompt(questions);
  return answers.goodToGo;
};

const runGit = async (command) => {
  try {
    await promisify(exec)(command);
  } catch (err) {
    throw new Error(kleur.red(err));
  }
};

const preflightValidation = async () => {
  // check if the current branch is allowed
  const branch = await runGit("git rev-parse --abbrev-ref HEAD");

  /*
   * check if the current branch has a tracking remote
   * check if the repo is dirty (uncommited files)
   */
};

module.exports = {
  displayConfirmation,
  preflightValidation,
  runGit,
  startSpinner,
};
