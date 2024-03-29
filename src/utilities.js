const _ = require("lodash");
const inquirer = require("inquirer");
const { red, yellow, cyan } = require("kleur");
const memoizeOne = require("async-memoize-one");
const fs = require("fs-extra");
const path = require("path");
const semver = require("semver");
const boxen = require("boxen");
const TeenyLogger = require("teeny-logger");
const {
  displayErrorMessages,
  runCommand,
  shallowMerge,
} = require("teeny-js-utilities");

const logger = new TeenyLogger({
  boring: process.env.NODE_ENV === "test",
});

const pkg = path.join(process.cwd(), "package.json");
const lernaPkg = path.join(process.cwd(), "lerna.json");

const COMMIT_MESSAGE = "git commit";
const PUSH_MESSAGE = "push";
const BUMP_TYPE_CUSTOM = "custom";
const BUMP_TYPE_SEPARATOR = "separator";
const DEFAULT_BUMP_POSITION = {
  custom: 16,
  major: 15,
  minor: 13,
  patch: 11,
  premajor: 14,
  preminor: 12,
  prepatch: 10,
};

const customizer = (def, cust, key) => {
  if (key === "nextPossible") {
    return _.orderBy(
      _.values(_.merge(_.keyBy(def, "type"), _.keyBy(cust, "type"))),
      ["pos"]
    );
  }
};

const mergeConfigurations = (defaultConfig, customConfig) => {
  const enhancedNextPossible = [];
  const res = shallowMerge(defaultConfig, customConfig, customizer);

  res.bump.nextPossible.forEach((nextPossible) => {
    if (typeof nextPossible.pos === "undefined") {
      nextPossible.pos = DEFAULT_BUMP_POSITION[nextPossible.type];
    }
    enhancedNextPossible.push(nextPossible);
  });
  res.bump.nextPossible = _.orderBy(enhancedNextPossible, ["pos"]);
  return res;
};

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

/* istanbul ignore next */
const readLernaJSON = async () => {
  let lernaJson;
  try {
    lernaJson = await fs.readJSON(lernaPkg);
    return lernaJson;
  } catch (err) {
    throw new Error(red(`Unable to parse lerna.json\n${err}`));
  }
};
const memoizedLernaJSON = memoizeOne(readLernaJSON);

const getCurrentVersion = async (config) => {
  /* istanbul ignore next */
  const { version } = config.bump.lerna
    ? await memoizedLernaJSON()
    : await memoizedPackageJSON();
  return version;
};

/* istanbul ignore next */
const getPackagesLocation = async (config) => {
  if (config.bump.lerna) {
    const { packages } = await memoizedLernaJSON();
    return packages;
  }
  return [];
};

const preflightValidation = async (config, local) => {
  /*
   * Check if the current branch is allowed
   * Check if the current branch has a tracking remote
   * Check if the repo is dirty (uncommitted files)
   */
  const branch = await runCommand("git rev-parse --abbrev-ref HEAD", {
    ignoreError: true,
  });
  const remote = await runCommand(
    "git rev-parse --symbolic-full-name --abbrev-ref @{u}",
    { ignoreError: true }
  );
  const dirty = await runCommand("git diff --no-ext-diff --quiet --exit-code", {
    ignoreError: true,
  });
  const version = await getCurrentVersion(config);
  /* istanbul ignore next */
  const packages = config.bump.lerna ? await getPackagesLocation(config) : [];

  if (!local) {
    const errorMessage = [];
    if (config.disallowedBranches.includes(branch)) {
      errorMessage.push(
        `Working branch cannot be one of "${config.disallowedBranches}".`
      );
    } else if (!config.allowedBranches.includes(branch)) {
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
    if (dirty.exitCode > 0) {
      errorMessage.push(
        `Working dir must be clean (no uncommited files).\n${dirty.shortMessage}`
      );
    }
    errorMessage.length && displayErrorMessages(errorMessage);
  }

  return {
    branch,
    packages,
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
        next.type !== BUMP_TYPE_CUSTOM && next.type !== BUMP_TYPE_SEPARATOR
          ? semver.inc(current, next.type, next.identifier)
          : next.type;

      if (next.type === BUMP_TYPE_SEPARATOR) {
        choices.push(new inquirer.Separator());
      } else {
        choices.push({
          name: next.prompt
            ? next.prompt(next.type, nextVersion)
            : `[${next.type}] ... bump to ${nextVersion}`,
          short: next.type,
          value: nextVersion,
        });
      }
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
    action: `git commit -m "${config.release.commitMessage(version)}"`,
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

const prepareBumpTasks = (config, version) => {
  const tasks = config.bump.prebump;
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

  const stageMsg = "git stage & commit";
  commands.push({
    action: `git add -A && git commit -a -m "${config.bump.commitMessage(
      version
    )}"`,
    "dry-run": global["dry-run"],
    name: stageMsg,
  });
  names.push(stageMsg);

  if (!config.bump.local) {
    commands.push({
      action: `git push --no-verify`,
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
  lernaPkg,
  logger,
  memoizedLernaJSON,
  memoizedPackageJSON,
  mergeConfigurations,
  pkg,
  preflightValidation,
  prepareBumpTasks,
  prepareReleaseTasks,
  shouldContinue,
};
