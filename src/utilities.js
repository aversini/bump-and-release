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

/* istanbul ignore next */
const startSpinner = (msg) => ora(msg).start();

/* istanbul ignore next */
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

const upperFirst = (str) => str[0].toUpperCase() + str.slice(1);

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
  if (errorMsg && errorMsg.length) {
    log();
    errorMsg.forEach(function (msg) {
      log(msg);
    });
    log();
    process.exit(0);
  }
};

const displayIntroductionMessage = ({ version, branch, remote }) => {
  log();
  log(`Current version is ${kleur.cyan(version)}`);
  log(`Current branch is ${kleur.cyan(branch)}`);
  log(`Current tracking remote is ${kleur.cyan(remote)}`);
  log();
  if (global["dry-run"]) {
    log("Dry-run mode is ON");
    log();
  }
};

const shouldContinue = (goodToGo) => {
  if (!goodToGo) {
    log("\nBye then!");
    process.exit(0);
  }
  return true;
};

const readPackageJSON = async () => {
  let packageJson;
  try {
    packageJson = await fs.readJSON(pkg);
    return packageJson;
  } catch (err) {
    /* istanbul ignore next */
    throw new Error(kleur.red(`Unable to parse package.json\n${err}`));
  }
};
const memoizedPackageJSON = memoizeOne(readPackageJSON);

const runCommand = async (
  command,
  { verbose: verbose, ignoreError: ignoreError } = {
    verbose: false,
    ignoreError: false,
  }
) => {
  try {
    const { stdout, stderr } = await exec(command);
    return verbose
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
   * Check if the repo is dirty (uncommitted files)
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

  if (!config.allowedBranches.includes(branch)) {
    errorMessage.push(
      kleur
        .bold()
        .red(`Working branch must be one of "${config.allowedBranches}".`)
    );
  }

  if (!config.allowedRemotes.includes(remote)) {
    errorMessage.push(
      kleur
        .bold()
        .red(`Tracking remote must be one of "${config.allowedRemotes}".`)
    );
  }
  /* istanbul ignore if */
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
  upperFirst,
  displayConfirmation,
  displayErrorMessages,
  displayIntroductionMessage,
  log,
  memoizedPackageJSON,
  pkg,
  preflightValidation,
  runCommand,
  shouldContinue,
  startSpinner,
  Spinner,
  // private methods
  _getCurrentVersion: getCurrentVersion,
};
