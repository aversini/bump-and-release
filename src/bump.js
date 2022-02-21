const fs = require("fs-extra");
const inquirer = require("inquirer");
const kleur = require("kleur");
const semver = require("semver");
const path = require("path");
const fg = require("fast-glob");
const { runCommand, Spinner, upperFirst } = require("teeny-js-utilities");

const pkgLock = path.join(process.cwd(), "package-lock.json");

const {
  BUMP_TYPE_CUSTOM,
  COMMIT_MESSAGE,
  PUSH_MESSAGE,
  displayConfirmation,
  displayIntroductionMessage,
  getNextPossibleVersions,
  lernaPkg,
  logger,
  memoizedLernaJSON,
  memoizedPackageJSON,
  pkg,
  preflightValidation,
  prepareBumpTasks,
  shouldContinue,
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
const updatePackageJson = async (newVersion, packages) => {
  if (!global["dry-run"]) {
    if (packages && packages.length) {
      /**
       * This is a monorepo with packages listed in lerna.json
       * - Need to update lerna.json with the new version
       * - Need to bump all packages.json under packages
       */
      const lernaJson = await memoizedLernaJSON();
      lernaJson.version = newVersion;
      try {
        await fs.writeJSON(lernaPkg, lernaJson, {
          spaces: 2,
        });
      } catch (err) {
        throw new Error(`Unable to update lerna.json\n${err}`);
      }
      packages.forEach((item) => {
        const entries = item.endsWith("*")
          ? fg.sync([`${item.replace("*", "**")}/package.json`], { deep: 2 })
          : fg.sync([`${item}/package.json`], { deep: 1 });
        entries.forEach((entry) => {
          const customPkg = path.join(process.cwd(), entry);
          const customPkgLock = path.join(
            process.cwd(),
            entry.replace("package.json", "package-lock.json")
          );

          try {
            const packageJson = fs.readJSONSync(customPkg);
            packageJson.version = newVersion;
            fs.writeJSONSync(customPkg, packageJson, {
              spaces: 2,
            });
          } catch (err) {
            throw new Error(`Unable to update package.json\n${err}`);
          }

          try {
            const packageLockJson = fs.readJSONSync(customPkgLock);
            packageLockJson.version = newVersion;
            fs.writeJSONSync(customPkgLock, packageLockJson, {
              spaces: 2,
            });
          } catch (err) {
            // ignoring as there may not be a lock file
          }
        });
      });
    } else {
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
  }
};

const promptForBumpType = async ({ current, config }) => {
  const { defaultChoice, choices } = getNextPossibleVersions({
    config,
    current,
  });
  const questions = {
    choices,
    default: defaultChoice,
    message: "Please choose one of the following options for the next version",
    name: "action",
    type: "list",
  };

  const answer = await inquirer.prompt(questions);

  /* istanbul ignore if */
  if (answer.action === BUMP_TYPE_CUSTOM) {
    const newAnswer = await inquirer.prompt({
      message: "Type a valid semver version",
      name: "version",
      type: "input",
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

const runBumpTasks = async (commands, newVersion) => {
  let error = false;
  const spinner = new Spinner("Starting bump tasks...");

  for (const command of commands) {
    spinner.text =
      command.name.toLowerCase() !== PUSH_MESSAGE.toLowerCase()
        ? upperFirst(command.name)
        : "Pushing to remote...";
    try {
      /* istanbul ignore else */
      if (command["dry-run"]) {
        logger.log(`\n${command.action}`);
      } else if (!error) {
        if (typeof command.action === "string") {
          // eslint-disable-next-line max-depth
          if (command.verbose) {
            const { stdout } = await runCommand(command.action, {
              verbose: true,
            });
            logger.log(`\n${stdout}\n`);
          } else {
            await runCommand(command.action);
          }
        } else if (typeof command.action === "function") {
          await command.action(newVersion);
        }
      }
    } catch (e) {
      /**
       * git commit will trip an error when there is
       * nothing to commit... The message is roughly:
       * "nothing to commit, working tree clean" but
       * it's interpreted as an error... so bypassing it.
       */
      /* istanbul ignore next */
      if (command.name !== COMMIT_MESSAGE) {
        spinner.fail(`Command ${command.name} failed:\n${e}`);
        error = true;
      }
    }
  }

  /* istanbul ignore else */
  if (!error) {
    spinner.succeed("Bump task(s) complete!");
  } else {
    spinner.fail("Bump task(s) incomplete!");
  }
};

module.exports = async (config, next) => {
  /* istanbul ignore next */
  if (next && typeof next === "string") {
    if (typeof semver.valid(next) === "string") {
      const newVersion = next;
      const { commands } = prepareBumpTasks(config, newVersion);
      await updatePackageJson(newVersion);
      await runBumpTasks(commands, newVersion);
    } else {
      logger.error(`Please use a valid semver version`);
      logger.log(`next was: ${next}`);
      process.exit(0);
    }
  } else {
    const { branch, remote, version, packages } = await preflightValidation(
      config
    );

    displayIntroductionMessage({ branch, remote, version });

    const newVersion = await promptForBumpType({ config, current: version });
    const { instruction, commands } = prepareBumpTasks(config, newVersion);

    const goodToGo = await displayConfirmation(
      `About to bump version from ${kleur.cyan(version)} to ${kleur.cyan(
        newVersion
      )} with the following actions: ${instruction}`
    );

    shouldContinue(goodToGo);
    await updatePackageJson(newVersion, packages);
    await runBumpTasks(commands, newVersion);
  }
};
