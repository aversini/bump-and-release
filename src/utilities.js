const inquirer = require("inquirer");
const kleur = require("kleur");
const ora = require("ora");
const util = require("util");
const memoizeOne = require("async-memoize-one");
const fs = require("fs-extra");
const path = require("path");
const exec = util.promisify(require("child_process").exec);

const pkg = path.join(process.cwd(), "package.json");

const ONE_SECOND = 1000;
const ALLOWED_BRANCHES = ["master"];
const ALLOWED_REMOTES = ["github/master"];

const startSpinner = (msg) => ora(msg).start();

class Spinner {
  constructor(msg) {
    this.spinner = ora();
    this.spinner.start(msg);
  }

  set text(msg) {
    this.spinner.text = msg;
  }

  start(msg) {
    this.spinner.start(msg);
  }

  fail(msg) {
    this.spinner.fail(msg);
  }

  succeed(msg) {
    setTimeout(() => {
      this.spinner.succeed(msg);
    }, ONE_SECOND);
  }
}

const log = (...args) => {
  // eslint-disable-next-line no-console
  console.log(...args);
};

const capitalize = (str) => str[0].toUpperCase() + str.slice(1);

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

const displayErrorMessages = (errorMsg) => {
  if (errorMsg.length) {
    let shouldExit = false;
    log();
    errorMsg.forEach(function (msg) {
      if (msg) {
        shouldExit = true;
        log(msg);
      }
    });
    if (shouldExit) {
      log();
      process.exit(0);
    }
  }
};

const shouldContinue = (goodToGo) => {
  if (!goodToGo) {
    log("\nBye then!");
    process.exit(0);
  }
};

const readPackageJSON = async () => {
  let packageJson;
  try {
    packageJson = await fs.readJSON(pkg);
    return packageJson;
  } catch (err) {
    throw new Error(kleur.red(`Unable to parse package.json\n${err}`));
  }
};
const memoizedPackageJSON = memoizeOne(readPackageJSON);

const runCommand = async (
  command,
  { std: std, ignoreError: ignoreError } = { std: false, ignoreError: false }
) => {
  try {
    const { stdout, stderr } = await exec(command);
    return std
      ? { stdout: stdout.replace(/\n$/, ""), stderr }
      : stdout.replace(/\n$/, "");
  } catch (err) {
    if (!ignoreError) {
      throw new Error(kleur.red(err));
    }
  }
};

const getCurrentVersion = async () => {
  const packageJson = await memoizedPackageJSON();
  return packageJson.version;
};

const preflightValidation = async (config) => {
  /*
   * Check if the current branch is allowed
   * Check if the current branch has a tracking remote
   * Check if the repo is dirty (uncommited files)
   */
  const branch = await runCommand("git rev-parse --abbrev-ref HEAD");
  const remote = await runCommand(
    "git rev-parse --symbolic-full-name --abbrev-ref @{u}"
  );
  const dirty = await runCommand(
    "git diff-index --name-only HEAD --exit-code",
    {
      ignoreError: true,
    }
  );
  const version = await getCurrentVersion();

  const errorMessage = [];

  if (!branch.includes(ALLOWED_BRANCHES)) {
    errorMessage.push(
      kleur.bold().red(`Working branch must be one of "${ALLOWED_BRANCHES}".`)
    );
  }
  if (!remote.includes(ALLOWED_REMOTES)) {
    errorMessage.push(
      kleur.bold().red(`Tracking remote must be one of "${ALLOWED_REMOTES}".`)
    );
  }
  if (typeof dirty === "undefined" && !config.bump.local) {
    errorMessage.push(
      kleur.bold().red("Working dir must be clean (no uncommited files).")
    );
  }

  displayErrorMessages(errorMessage);

  return {
    branch,
    remote,
    version,
  };
};

module.exports = {
  capitalize,
  displayConfirmation,
  displayErrorMessages,
  log,
  memoizedPackageJSON,
  pkg,
  preflightValidation,
  runCommand,
  shouldContinue,
  startSpinner,
  Spinner,
};
