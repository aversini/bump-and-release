const fs = require("fs-extra");
const inquirer = require("inquirer");
const kleur = require("kleur");
const memoizeOne = require("async-memoize-one");
const path = require("path");
const semver = require("semver");

const pkg = path.join(process.cwd(), "package.json");
const pkgLock = path.join(process.cwd(), "package-lock.json");
const {
  displayConfirmation,
  log,
  preflightValidation,
  startSpinner,
  runCommand,
} = require("./utilities");

const BUMP_TYPE_CUSTOM = "custom";

const readPackageJSON = async () => {
  let packageJson;
  try {
    packageJson = await fs.readJSON(pkg);
    return packageJson;
  } catch (err) {
    throw new Error(kleur.red(`Unable to parse package.json\n${err}`));
  }
};
const memoizeReadPackageJSON = memoizeOne(readPackageJSON);

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

const getCurrentVersion = async () => {
  const packageJson = await memoizeReadPackageJSON();
  return packageJson.version;
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

const updatePackageJson = async (newVersion) => {
  const packageJson = await memoizeReadPackageJSON();
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

module.exports = async (config) => {
  const { branch, remote } = await preflightValidation(config);
  const current = await getCurrentVersion();

  log();
  log(`Current version is ${kleur.cyan(current)}`);
  log(`Current branch is ${kleur.cyan(branch)}`);
  log(`Current tracking remote is ${kleur.cyan(remote)}`);
  log();

  const newVersion = await promptForBumpType({ current, config });
  const goodToGo = await displayConfirmation(
    `About to bump version from ${kleur.cyan(current)} to ${kleur.cyan(
      newVersion
    )}`
  );

  if (!goodToGo) {
    log("Bye then!");
    process.exit(0);
  }

  const spinner = startSpinner("Updating package.json...");
  await updatePackageJson(newVersion);
  spinner.text = "Git stage and commit...";
  await runCommand(
    `git add -A && git commit -a -m "${config.bump.commitMessage(newVersion)}"`
  );
  spinner.text = config.bump.local ? "Pushing to remote..." : "";
  if (!config.bump.local) {
    await runCommand("git push --no-verify");
  }

  setTimeout(() => {
    spinner.succeed("Version bump complete!");
  }, 1000);
};
