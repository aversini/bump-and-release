const fs = require("fs-extra");
const inquirer = require("inquirer");
const kleur = require("kleur");
const semver = require("semver");
const path = require("path");

const pkgLock = path.join(process.cwd(), "package-lock.json");

const {
  displayConfirmation,
  log,
  memoizedPackageJSON,
  pkg,
  preflightValidation,
  shouldContinue,
  Spinner,
  runCommand,
} = require("./utilities");

const BUMP_TYPE_CUSTOM = "custom";

const updatePackageLockJSON = async (version) => {
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
};

const updatePackageJson = async (newVersion) => {
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
};

const getNextPossibleVersions = ({ current, config }) => {
  const choices = [];
  config.bump.nextPossible.forEach((next) => {
    const nextVersion = semver.inc(current, next.type, next.identifier);
    choices.push({
      value: nextVersion,
      short: next.type,
      name: `[${next.type}] ... bump to ${nextVersion}`,
    });
  });

  choices.push({
    value: BUMP_TYPE_CUSTOM,
    short: "custom",
    name: "[custom] .. enter your own custom version",
  });

  return choices;
};

const promptForBumpType = async ({ current, config }) => {
  const choices = getNextPossibleVersions({ current, config });
  const questions = {
    type: "list",
    name: "action",
    message: "Please choose one of the following options for the next version",
    choices,
  };

  const answer = await inquirer.prompt(questions);

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

  log();
  log(`Current version is ${kleur.cyan(version)}`);
  log(`Current branch is ${kleur.cyan(branch)}`);
  log(`Current tracking remote is ${kleur.cyan(remote)}`);
  log();

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

  if (!global["dry-run"]) {
    await runCommand(
      `git add -A && git commit -a -m "${config.bump.commitMessage(
        newVersion
      )}"`
    );
  } else {
    log(
      `git add -A && git commit -a -m "${config.bump.commitMessage(
        newVersion
      )}"`
    );
  }

  if (!config.bump.local) {
    if (!global["dry-run"]) {
      spinner.text = "Pushing to remote...";
      await runCommand("git push --no-verify");
    } else {
      log("git push --no-verify");
    }
  }

  spinner.succeed("Version bump complete!");
};
