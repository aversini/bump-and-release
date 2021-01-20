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
  preflightValidation,
  startSpinner,
} = require("./utilities");

const BUMP_TYPE_RC = "rc";
const BUMP_TYPE_PATCH = "patch";
const BUMP_TYPE_MINOR = "minor";
const BUMP_TYPE_MAJOR = "major";
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

const getNextPossibleVersions = (current) => ({
  nextRC: semver.inc(current, "prerelease", "rc"),
  nextPatch: semver.inc(current, "patch"),
  nextMinor: semver.inc(current, "minor"),
  nextMajor: semver.inc(current, "major"),
});

const promptForBumpType = async (versions) => {
  const questions = {
    type: "list",
    name: "action",
    message: "Please choose one of the following options for version",
    default: BUMP_TYPE_MINOR,
    choices: [
      {
        value: BUMP_TYPE_RC,
        short: "rc",
        name: `[rc] ...... bump to next RC (${versions.nextRC})`,
      },
      {
        value: BUMP_TYPE_PATCH,
        short: "patch",
        name: `[patch] ... bump to next patch (${versions.nextPatch})`,
      },
      {
        value: BUMP_TYPE_MINOR,
        short: "minor",
        name: `[minor] ... bump to next minor (${versions.nextMinor})`,
      },
      {
        value: BUMP_TYPE_MAJOR,
        short: "major",
        name: `[major] ... bump to next major (${versions.nextMinor})`,
      },
      {
        value: BUMP_TYPE_CUSTOM,
        short: "custom",
        name: "[custom] .. enter your own custom version",
      },
    ],
  };

  const answer = await inquirer.prompt(questions);
  switch (answer.action) {
    case BUMP_TYPE_RC:
      return versions.nextRC;
    case BUMP_TYPE_PATCH:
      return versions.nextPatch;
    case BUMP_TYPE_MINOR:
      return versions.nextMinor;
    case BUMP_TYPE_MAJOR:
      return versions.nextMajor;

    default: {
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
    }
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

module.exports = async () => {
  await preflightValidation();
  const current = await getCurrentVersion();
  const newVersion = await promptForBumpType(getNextPossibleVersions(current));
  const goodToGo = await displayConfirmation(
    `About to bump version from ${kleur.cyan(current)} to ${kleur.cyan(
      newVersion
    )}`
  );

  if (goodToGo) {
    const spinner = startSpinner("Updating package.json");
    await updatePackageJson(newVersion);
    setTimeout(() => {
      spinner.stop();
    }, 1000);
  }
};
