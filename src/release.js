const {
  upperFirst,
  displayConfirmation,
  displayIntroductionMessage,
  log,
  preflightValidation,
  shouldContinue,
  Spinner,
  runCommand,
} = require("./utilities");

const commitMsg = "git commit";
const pushMsg = "push";

const prepareReleaseTasks = async (config, version) => {
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
    name: commitMsg,
    "dry-run": global["dry-run"],
  });
  names.push(commitMsg);

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
    commands.push({
      action: "git push --no-verify && git push --tags --no-verify",
      name: pushMsg,
      "dry-run": global["dry-run"],
    });
    names.push(pushMsg);
  }

  return {
    commands,
    // eslint-disable-next-line no-useless-concat
    instruction: `${names.join(", ").replace(/,([^,]*)$/, " and" + "$1")}...`,
  };
};

const runReleaseTasks = async (commands) => {
  let error = false;
  const spinner = new Spinner("Starting release tasks...");

  for (const command of commands) {
    spinner.text =
      command.name.toLowerCase() !== pushMsg.toLowerCase()
        ? upperFirst(command.name)
        : "Pushing to remote...";
    try {
      if (command["dry-run"]) {
        log(command.action);
      } else if (!error) {
        if (command.verbose) {
          const { stdout } = await runCommand(command.action, {
            verbose: true,
          });
          log(`\n${stdout}\n`);
        } else {
          await runCommand(command.action);
        }
      }
    } catch (e) {
      /**
       * git commit will trip an error when there is
       * nothing to commit... The message is roughly:
       * "nothing to commit, working tree clean" but
       * it's interpreted as an error... so bypassing it.
       */
      if (command.name !== commitMsg) {
        spinner.fail(`Command ${command.name} failed:\n${e}`);
        error = true;
      }
    }
  }

  if (!error) {
    spinner.succeed("Release task(s) complete!");
  }
};

module.exports = async (config) => {
  const { branch, remote, version } = await preflightValidation(config);

  displayIntroductionMessage({ version, branch, remote });

  const { instruction, commands } = await prepareReleaseTasks(config, version);

  const goodToGo = await displayConfirmation(`About to ${instruction}`);

  shouldContinue(goodToGo);
  runReleaseTasks(commands);
};
