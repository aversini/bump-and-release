const _ = require("lodash");
const inquirer = require("inquirer");
const { red, yellow, cyan } = require("kleur");
const ora = require("ora");
const memoizeOne = require("async-memoize-one");
const fs = require("fs-extra");
const path = require("path");
const semver = require("semver");
const execa = require("execa");
const boxen = require("boxen");
const TeenyLogger = require("teeny-logger");
const logger = new TeenyLogger({
  boring: process.env.NODE_ENV === "test",
});

const pkg = path.join(process.cwd(), "package.json");

const ONE_SECOND = 1000;
const COMMIT_MESSAGE = "git commit";
const PUSH_MESSAGE = "push";
const BUMP_TYPE_CUSTOM = "custom";

/* istanbul ignore next */
class Spinner {
  constructor(msg) {
    this.spinner = ora({
      isSilent: process.env.NODE_ENV === "test",
    });
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

const upperFirst = (str) => str[0].toUpperCase() + str.slice(1);

/**
 *
 * WARNING: this method is nasty! It will alter the original
 * objects... This needs to be fixed, but for now, it's what it is.
 *
 */
const mergeConfigurations = (defaultConfig, customConfig) =>
  _.mergeWith(defaultConfig, customConfig, (def, cust, key) => {
    if (key === "nextPossible") {
      return _.orderBy(
        _.values(_.merge(_.keyBy(def, "type"), _.keyBy(cust, "type"))),
        ["pos"]
      );
    }
  });

const displayConfirmation = async (msg) => {
  const questions = {
    type: "confirm",
    name: "goodToGo",
    message: "Do you want to continue?",
    default: true,
  };

  logger.log();
  logger.log(msg);
  logger.log();

  const answers = await inquirer.prompt(questions);
  return answers.goodToGo;
};

const displayErrorMessages = (errorMsg) => {
  if (errorMsg && errorMsg.length) {
    logger.log();
    errorMsg.forEach(function (msg) {
      logger.error(msg);
    });
    logger.log();
    process.exit(0);
  }
};

const displayIntroductionMessage = ({ version, branch, remote }) => {
  const dryRunMsg = global["dry-run"]
    ? `\n${yellow("Dry-run mode is ON")}`
    : "";
  const msg = `Current version is ${cyan(version)}
Current branch is ${cyan(branch)}
Current tracking remote is ${cyan(remote)}${dryRunMsg}`;

  logger.log();
  logger.log(
    process.env.NODE_ENV === "test"
      ? msg
      : /* istanbul ignore next */
        boxen(msg, {
          padding: 1,
          align: "center",
          borderColor: "yellow",
        })
  );
  logger.log();
};

const shouldContinue = (goodToGo) => {
  if (!goodToGo) {
    logger.log("\nBye then!");
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
    throw new Error(red(`Unable to parse package.json\n${err}`));
  }
};
const memoizedPackageJSON = memoizeOne(readPackageJSON);

const getCurrentVersion = async () => {
  const packageJson = await memoizedPackageJSON();
  return packageJson.version;
};

const runCommand = async (
  command,
  { verbose: verbose, ignoreError: ignoreError } = {
    verbose: false,
    ignoreError: false,
  }
) => {
  try {
    const { stdout, stderr } = await execa.command(command);
    return verbose ? { stdout, stderr } : stdout;
  } catch (err) {
    if (!ignoreError) {
      throw new Error(red(err));
    }
  }
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
      `Working branch must be one of "${config.allowedBranches}".`
    );
  }

  if (!config.allowedRemotes.includes(remote)) {
    errorMessage.push(
      `Tracking remote must be one of "${config.allowedRemotes}".`
    );
  }
  /* istanbul ignore next */
  if (typeof dirty === "undefined" && !config.bump.local) {
    errorMessage.push("Working dir must be clean (no uncommited files).");
  }

  displayErrorMessages(errorMessage);

  return {
    branch,
    remote,
    version,
  };
};

const getNextPossibleVersions = ({ current, config }) => {
  const choices = [];
  let index = 0,
    defaultChoice = 0;
  config.bump.nextPossible.forEach((next) => {
    if (next.enabled || typeof next.enabled === "undefined") {
      if (next.default) {
        defaultChoice = index;
      }
      index++;
      const nextVersion =
        next.type !== BUMP_TYPE_CUSTOM
          ? semver.inc(current, next.type, next.identifier)
          : BUMP_TYPE_CUSTOM;
      if (next.type === BUMP_TYPE_CUSTOM) {
        choices.push(new inquirer.Separator());
      }
      choices.push({
        value: nextVersion,
        short: next.type,
        name: next.prompt
          ? next.prompt(next.type, nextVersion)
          : `[${next.type}] ... bump to ${nextVersion}`,
      });
    }
  });
  return { choices, defaultChoice };
};

const prepareReleaseTasks = (config, version) => {
  const tasks = config.release.prerelease;
  const commands = [];
  const names = [];
  if (tasks.length) {
    tasks.forEach((task) => {
      const name = task.name ? task.name : task.command;
      commands.push({
        action: task.command,
        name,
        verbose: task.verbose ? task.verbose : false,
        "dry-run": global["dry-run"],
      });
      names.push(name);
    });
  }

  const stageMsg = "git stage";
  commands.push({
    action: `git add -A`,
    name: stageMsg,
    "dry-run": global["dry-run"],
  });
  names.push(stageMsg);

  commands.push({
    action: `git commit -a -m "${config.release.commitMessage(version)}"`,
    name: COMMIT_MESSAGE,
    "dry-run": global["dry-run"],
  });
  names.push(COMMIT_MESSAGE);

  const tagTask = config.release.tag;
  if (tagTask.enabled) {
    const name = "tag";
    commands.push({
      action: `git tag -a ${tagTask.prefix}${version} -m "version ${version}"`,
      name,
      "dry-run": global["dry-run"],
    });
    names.push(name);
  }

  if (!config.release.local) {
    const action = tagTask.enabled
      ? "git push --no-verify && git push --tags --no-verify"
      : "git push --no-verify";
    commands.push({
      action,
      name: PUSH_MESSAGE,
      "dry-run": global["dry-run"],
    });
    names.push(PUSH_MESSAGE);
  }

  return {
    commands,
    // eslint-disable-next-line no-useless-concat
    instruction: `${names.join(", ").replace(/,([^,]*)$/, " and" + "$1")}...`,
  };
};

module.exports = {
  // constants
  BUMP_TYPE_CUSTOM,
  COMMIT_MESSAGE,
  PUSH_MESSAGE,
  // public methods
  upperFirst,
  displayConfirmation,
  displayErrorMessages,
  displayIntroductionMessage,
  getNextPossibleVersions,
  logger,
  memoizedPackageJSON,
  mergeConfigurations,
  pkg,
  preflightValidation,
  prepareReleaseTasks,
  runCommand,
  shouldContinue,
  Spinner,
  // private methods
  _getCurrentVersion: getCurrentVersion,
};
