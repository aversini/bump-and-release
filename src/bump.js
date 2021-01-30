const fs = require("fs-extra");
const inquirer = require("inquirer");
const kleur = require("kleur");
const semver = require("semver");
const path = require("path");

const pkgLock = path.join(process.cwd(), "package-lock.json");

const {
  BUMP_TYPE_CUSTOM,
  displayConfirmation,
  displayIntroductionMessage,
  getNextPossibleVersions,
  logger,
  memoizedPackageJSON,
  pkg,
  preflightValidation,
  shouldContinue,
  Spinner,
  runCommand,
} = require("./utilities");

/* istanbul ignore next */
const updatePackageLockJSON = async (version) => {
  if (!global["dry-run"]) {
    let packageLockJson;
    try {
      packageLockJson = await fs.readJSON(pkgLock);
      packageLockJson.version = version;
      await fs.writeJSON(pkgLock, packageLockJson, {
        spaces: 2,
      });
    } catch (err) {
      // nothing to declare officer
    }
  }
};

/* istanbul ignore next */
const updatePackageJson = async (newVersion) => {
  if (!global["dry-run"]) {
    const packageJson = await memoizedPackageJSON();
    packageJson.version = newVersion;
    try {
      await fs.writeJSON(pkg, packageJson, {
        spaces: 2,
      });
      await updatePackageLockJSON(newVersion);
    } catch (err) {
      throw new Error(`Unable to update package.json\n${err}`);
    }
  }
};

const promptForBumpType = async ({ current, config }) => {
  const { defaultChoice, choices } = getNextPossibleVersions({
    current,
    config,
  });
  const questions = {
    type: "list",
    name: "action",
    default: defaultChoice,
    message: "Please choose one of the following options for the next version",
    choices,
  };

  const answer = await inquirer.prompt(questions);

  /* istanbul ignore if */
  if (answer.action === BUMP_TYPE_CUSTOM) {
    const newAnswer = await inquirer.prompt({
      type: "input",
      name: "version",
      message: "Type a valid semver version",
      validate(val) {
        if (!val.length || !semver.valid(val)) {
          return "Please enter a valid semver version, or <CTRL-C> to quit...";
        }
        return true;
      },
    });
    return newAnswer.version;
  } else {
    return answer.action;
  }
};

module.exports = async (config) => {
  const { branch, remote, version } = await preflightValidation(config);

  displayIntroductionMessage({ version, branch, remote });

  const newVersion = await promptForBumpType({ current: version, config });
  const goodToGo = await displayConfirmation(
    `About to bump version from ${kleur.cyan(version)} to ${kleur.cyan(
      newVersion
    )}`
  );

  shouldContinue(goodToGo);

  const spinner = new Spinner("Updating package.json...");

  await updatePackageJson(newVersion);
  spinner.text = "Git stage and commit...";

  /* istanbul ignore if */
  if (!global["dry-run"]) {
    await runCommand(
      `git add -A && git commit -a -m "${config.bump.commitMessage(
        newVersion
      )}"`
    );
  } else {
    logger.log(
      `git add -A && git commit -a -m "${config.bump.commitMessage(
        newVersion
      )}"`
    );
  }

  if (!config.bump.local) {
    /* istanbul ignore if */
    if (!global["dry-run"]) {
      spinner.text = "Pushing to remote...";
      await runCommand("git push --no-verify");
    } else {
      logger.log("git push --no-verify");
    }
  }

  spinner.succeed("Version bump complete!");
};
