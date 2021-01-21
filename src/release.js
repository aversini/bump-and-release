const kleur = require("kleur");

const {
  displayConfirmation,
  log,
  preflightValidation,
  shouldContinue,
  Spinner,
  runCommand,
} = require("./utilities");

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
      });
      names.push(name);
    });
  }

  const stageAndCommitMsg = "git stage & commit";
  commands.push({
    action: `git add -A && git commit -a -m "${config.release.commitMessage(
      version
    )}"`,
    name: stageAndCommitMsg,
  });
  names.push(stageAndCommitMsg);

  const tagTask = config.release.tag;
  if (tagTask.enabled) {
    const name = "tag";
    commands.push({
      action: `git tag -a ${tagTask.prefix}${version} -m "version ${version}"`,
      name,
    });
    names.push(name);
  }

  if (!config.release.local) {
    const name = "push";
    commands.push({
      action: "git push --no-verify && git push --tags --no-verify",
      name,
    });
    names.push(name);
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
    spinner.text = command.name;
    try {
      await runCommand(command.action);
    } catch (e) {
      spinner.fail(e);
      error = true;
    }
  }
  if (!error) {
    spinner.succeed("Release task(s) complete!");
  }
};

module.exports = async (config) => {
  const { branch, remote, version } = await preflightValidation(config);

  log();
  log(`Current version is ${kleur.cyan(version)}`);
  log(`Current branch is ${kleur.cyan(branch)}`);
  log(`Current tracking remote is ${kleur.cyan(remote)}`);
  log();

  const { instruction, commands } = await prepareReleaseTasks(config, version);

  const goodToGo = await displayConfirmation(`About to ${instruction}`);

  shouldContinue(goodToGo);
  runReleaseTasks(commands);
};
