const _ = require("lodash");
const inquirer = require("inquirer");
const { red, yellow, cyan } = require("kleur");
const memoizeOne = require("async-memoize-one");
const fs = require("fs-extra");
const path = require("path");
const semver = require("semver");
const boxen = require("boxen");
const TeenyLogger = require("teeny-logger");
const { displayErrorMessages, runCommand } = require("teeny-js-utilities");

const logger = new TeenyLogger({
  boring: process.env.NODE_ENV === "test",
});

const pkg = path.join(process.cwd(), "package.json");

const COMMIT_MESSAGE = "git commit";
const PUSH_MESSAGE = "push";
const BUMP_TYPE_CUSTOM = "custom";

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
    default: true,
    message: "Do you want to continue?",
    name: "goodToGo",
    type: "confirm",
  };

  logger.log();
  logger.log(msg);
  logger.log();

  const answers = await inquirer.prompt(questions);
  return answers.goodToGo;
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
          align: "center",
          borderColor: "yellow",
          padding: 1,
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
  const dirty = await runCommand("git diff --no-ext-diff --quiet --exit-code", {
    ignoreError: true,
  });
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
  if (dirty.exitCode > 0 && !config.bump.local && !config.release.local) {
    errorMessage.push(
      `Working dir must be clean (no uncommited files).\n${dirty.shortMessage}`
    );
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
        name: next.prompt
          ? next.prompt(next.type, nextVersion)
          : `[${next.type}] ... bump to ${nextVersion}`,
        short: next.type,
        value: nextVersion,
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
        "dry-run": global["dry-run"],
        name,
        verbose: task.verbose ? task.verbose : false,
      });
      names.push(name);
    });
  }

  const stageMsg = "git stage";
  commands.push({
    action: `git add -A`,
    "dry-run": global["dry-run"],
    name: stageMsg,
  });
  names.push(stageMsg);

  commands.push({
    action: `git commit -a -m "${config.release.commitMessage(version)}"`,
    "dry-run": global["dry-run"],
    name: COMMIT_MESSAGE,
  });
  names.push(COMMIT_MESSAGE);

  const tagTask = config.release.tag;
  if (tagTask.enabled) {
    const name = "tag";
    commands.push({
      action: `git tag -a ${tagTask.prefix}${version} -m "version ${version}"`,
      "dry-run": global["dry-run"],
      name,
    });
    names.push(name);
  }

  if (!config.release.local) {
    const action = tagTask.enabled
      ? "git push --no-verify && git push --tags --no-verify"
      : "git push --no-verify";
    commands.push({
      action,
      "dry-run": global["dry-run"],
      name: PUSH_MESSAGE,
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
  // private methods
  _getCurrentVersion: getCurrentVersion,
  // constants
  BUMP_TYPE_CUSTOM,
  COMMIT_MESSAGE,
  PUSH_MESSAGE,
  // public methods
  displayConfirmation,
  displayIntroductionMessage,
  getNextPossibleVersions,
  logger,
  memoizedPackageJSON,
  mergeConfigurations,
  pkg,
  preflightValidation,
  prepareReleaseTasks,
  shouldContinue,
};
