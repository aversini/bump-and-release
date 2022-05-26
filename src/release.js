const { runCommand, Spinner, upperFirst } = require("teeny-js-utilities");

const {
  COMMIT_MESSAGE,
  PUSH_MESSAGE,
  displayConfirmation,
  displayIntroductionMessage,
  logger,
  preflightValidation,
  prepareReleaseTasks,
  shouldContinue,
} = require("./utilities");

const runReleaseTasks = async (commands, version) => {
  let error = false;
  const spinner = new Spinner("Starting release tasks...");

  for (const command of commands) {
    spinner.text =
      command.name.toLowerCase() !== PUSH_MESSAGE.toLowerCase()
        ? upperFirst(command.name)
        : "Pushing to remote...";
    try {
      /* istanbul ignore else */
      if (command["dry-run"]) {
        logger.log(command.action);
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
          await command.action(version);
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
    spinner.succeed("Release task(s) complete!");
  } else {
    spinner.fail("Release task(s) incomplete!");
  }
};

module.exports = async (config) => {
  const { branch, remote, version } = await preflightValidation(
    config,
    config.release.local
  );

  displayIntroductionMessage({ branch, remote, version });

  const { instruction, commands } = prepareReleaseTasks(config, version);

  const goodToGo = await displayConfirmation(`About to ${instruction}`);

  shouldContinue(goodToGo);
  await runReleaseTasks(commands, version);
};
