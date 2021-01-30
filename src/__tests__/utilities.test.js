const inquirer = require("inquirer");
const currentVersion = require("../../package.json").version;

const {
  BUMP_TYPE_CUSTOM,
  displayConfirmation,
  displayIntroductionMessage,
  displayErrorMessages,
  getNextPossibleVersions,
  logger,
  mergeConfigurations,
  preflightValidation,
  prepareReleaseTasks,
  runCommand,
  shouldContinue,
  upperFirst,
  // private methods
  _getCurrentVersion,
} = require("../utilities");

const deepEqual = require("./helpers/deepEqual");

let mockLog,
  mockLogError,
  mockLogWarning,
  mockPrompt,
  spyExit,
  spyLog,
  spyLogError,
  spyLogWarning,
  spyPrompt,
  mockExit;

describe("when testing for individual utilities wtih no logging side-effects", () => {
  it("should convert the first letter of a sentence to uppercase", async () => {
    expect(upperFirst("this is a test")).toBe("This is a test");
  });

  it("should extract the version from the package.json file", async () => {
    const version = await _getCurrentVersion();
    expect(version).toBe(currentVersion);
  });

  it("should run preflight with no errors and return the valid branch/remote/version", async () => {
    const { branch, remote, version } = await preflightValidation({
      allowedBranches: ["master"],
      allowedRemotes: ["github/master"],
      bump: {
        local: true,
      },
    });
    expect(branch).toBe("master");
    expect(remote).toBe("github/master");
    expect(version).toBe(currentVersion);
  });

  it("should return the command output via stdout", async () => {
    const { stdout, stderr } = await runCommand("echo 'hello'", {
      verbose: true,
    });
    expect(stdout).toBe("'hello'");
    expect(stderr).toBe("");
  });

  it("should not return the command output via stdout", async () => {
    const { stdout, stderr } = await runCommand("echo 'hello'");
    expect(stdout).not.toBeDefined();
    expect(stderr).not.toBeDefined();
  });

  it("should throw an error if the command fails", async () => {
    await expect(runCommand("not-a-command")).rejects.toBeTruthy();
  });

  it("should not throw an error even if the command fails", async () => {
    await expect(
      runCommand("not-a-command", { ignoreError: true })
    ).resolves.toBeUndefined();
  });

  it("should return the corresponding choices for the next possible versions", async () => {
    const config = {
      bump: {
        nextPossible: [
          {
            type: "prerelease",
            enabled: false,
          },
          {
            type: "patch",
            prompt: (type, version) =>
              `[${type}] ... bump to next ${type} (${version})`,
          },
          {
            type: "minor",
            prompt: (type, version) =>
              `[${type}] ... bump to next ${type} (${version})`,
          },
          {
            type: "major",
            default: true,
          },
          {
            type: "custom",
            prompt: (type) => `[${type}] .. enter your own custom version`,
          },
        ],
      },
    };
    const expectedChoices = [
      {
        value: "1.0.2",
        short: "patch",
        name: "[patch] ... bump to next patch (1.0.2)",
      },
      {
        value: "1.1.0",
        short: "minor",
        name: "[minor] ... bump to next minor (1.1.0)",
      },
      {
        value: "2.0.0",
        short: "major",
        name: "[major] ... bump to 2.0.0",
      },
      new inquirer.Separator(),
      {
        value: BUMP_TYPE_CUSTOM,
        short: "custom",
        name: "[custom] .. enter your own custom version",
      },
    ];
    const { choices, defaultChoice } = getNextPossibleVersions({
      current: "1.0.1",
      config,
    });
    expect(deepEqual(choices, expectedChoices)).toBe(true);
    // eslint-disable-next-line no-magic-numbers
    expect(defaultChoice).toBe(2);
  });

  it("should return the corresponding commands for the corresponding configuration", async () => {
    const config = {
      release: {
        local: false,
        commitMessage: (version) => `chore: tagging release ${version}`,
        prerelease: [
          {
            command: "npm run test",
          },
          {
            name: "generate changelog",
            command: "npm run changelog",
          },
          {
            name: "run bundlesize",
            command: "npm run bundlesize",
            verbose: true,
          },
        ],
        tag: {
          enabled: true,
          prefix: "v",
        },
      },
    };
    const { commands, instruction } = prepareReleaseTasks(config, "6.6.6");
    const expectedCommands = [
      {
        action: "npm run test",
        name: "npm run test",
        verbose: false,
        "dry-run": true,
      },
      {
        action: "npm run changelog",
        name: "generate changelog",
        verbose: false,
        "dry-run": true,
      },
      {
        action: "npm run bundlesize",
        name: "run bundlesize",
        verbose: true,
        "dry-run": true,
      },
      { action: "git add -A", name: "git stage", "dry-run": true },
      {
        action: 'git commit -a -m "chore: tagging release 6.6.6"',
        name: "git commit",
        "dry-run": true,
      },
      {
        action: 'git tag -a v6.6.6 -m "version 6.6.6"',
        name: "tag",
        "dry-run": true,
      },
      {
        action: "git push --no-verify && git push --tags --no-verify",
        name: "push",
        "dry-run": true,
      },
    ];

    expect(instruction).toBe(
      "npm run test, generate changelog, run bundlesize, git stage, git commit, tag and push..."
    );
    expect(deepEqual(expectedCommands, commands)).toBe(true);
  });

  it("should return the corresponding commands with no tagging", async () => {
    const config = {
      release: {
        local: false,
        commitMessage: (version) => `chore: releasing version ${version}`,
        prerelease: [
          {
            command: "npm run test",
          },
          {
            name: "generate changelog",
            command: "npm run changelog",
          },
          {
            name: "run bundlesize",
            command: "npm run bundlesize",
            verbose: true,
          },
        ],
        tag: {
          enabled: false,
          prefix: "v",
        },
      },
    };
    const { commands, instruction } = prepareReleaseTasks(config, "6.6.6");
    const expectedCommands = [
      {
        action: "npm run test",
        name: "npm run test",
        verbose: false,
        "dry-run": true,
      },
      {
        action: "npm run changelog",
        name: "generate changelog",
        verbose: false,
        "dry-run": true,
      },
      {
        action: "npm run bundlesize",
        name: "run bundlesize",
        verbose: true,
        "dry-run": true,
      },
      { action: "git add -A", name: "git stage", "dry-run": true },
      {
        action: 'git commit -a -m "chore: releasing version 6.6.6"',
        name: "git commit",
        "dry-run": true,
      },
      {
        action: "git push --no-verify",
        name: "push",
        "dry-run": true,
      },
    ];

    expect(instruction).toBe(
      "npm run test, generate changelog, run bundlesize, git stage, git commit and push..."
    );
    expect(deepEqual(expectedCommands, commands)).toBe(true);
  });

  it("should return the corresponding commands with no tagging, and local is true", async () => {
    const config = {
      release: {
        local: true,
        commitMessage: (version) => `chore: releasing version ${version}`,
        prerelease: [
          {
            command: "npm run test",
          },
          {
            name: "generate changelog",
            command: "npm run changelog",
          },
          {
            name: "run bundlesize",
            command: "npm run bundlesize",
            verbose: true,
          },
        ],
        tag: {
          enabled: false,
          prefix: "v",
        },
      },
    };
    const { commands, instruction } = prepareReleaseTasks(config, "6.6.6");
    const expectedCommands = [
      {
        action: "npm run test",
        name: "npm run test",
        verbose: false,
        "dry-run": true,
      },
      {
        action: "npm run changelog",
        name: "generate changelog",
        verbose: false,
        "dry-run": true,
      },
      {
        action: "npm run bundlesize",
        name: "run bundlesize",
        verbose: true,
        "dry-run": true,
      },
      { action: "git add -A", name: "git stage", "dry-run": true },
      {
        action: 'git commit -a -m "chore: releasing version 6.6.6"',
        name: "git commit",
        "dry-run": true,
      },
    ];

    expect(instruction).toBe(
      "npm run test, generate changelog, run bundlesize, git stage and git commit..."
    );
    expect(deepEqual(expectedCommands, commands)).toBe(true);
  });
});

describe("when testing for configuration merging wtih no logging side-effects", () => {
  it("should perform a deep equality between 2 exact same objects", async () => {
    const config = {
      bump: {
        nextPossible: [
          {
            type: "minor",
            default: true,
          },
        ],
      },
      release: {
        prerelease: [
          {
            name: "run tests",
            command: "npm run test",
          },
          {
            name: "generate changelog",
            command: "npm run changelog",
          },
        ],
      },
    };
    expect(deepEqual(config, config)).toBe(true);
  });

  it("should perform a deep equality between 2 slightly different objects", async () => {
    const configA = {
      bump: {
        nextPossible: [
          {
            type: "minor",
            default: true,
          },
        ],
      },
      release: {
        prerelease: [
          {
            name: "run tests",
            command: "npm run test",
          },
          {
            name: "generate changelog",
            command: "npm run changelog",
          },
        ],
      },
    };
    const configB = {
      bump: {
        nextPossible: [
          {
            type: "minor",
            default: false,
          },
        ],
      },
      release: {
        prerelease: [
          {
            name: "run tests",
            command: "npm run test",
          },
          {
            name: "generate changelog",
            command: "npm run changelog",
          },
        ],
      },
    };
    expect(deepEqual(configA, configB)).toBe(false);
  });

  it("should perform a deep equality between 2 completely different objects", async () => {
    const configA = {
      bump: {
        nextPossible: [
          {
            type: "minor",
            default: true,
          },
        ],
      },
    };
    const configB = {
      bump: {
        nextPossible: [
          {
            type: "minor",
            default: false,
          },
        ],
      },
      release: true,
    };
    expect(deepEqual(configA, configB)).toBe(false);
  });

  it("should return a new configuration with custom nexPossible", async () => {
    const configA = {
      bump: {
        nextPossible: [
          {
            type: "minor",
            default: false,
          },
        ],
      },
    };
    const configB = {
      bump: {
        nextPossible: [
          {
            type: "minor",
            default: true,
          },
        ],
      },
    };
    expect(deepEqual(configA, configB)).toBe(false);
    /**
     * This method will alter the objects, so no way to test for their
     * equality AFTER the merge is done... Only thing we can do is test
     * that the end result gets the right values.
     */
    const res = mergeConfigurations(configA, configB);

    expect(
      deepEqual(res.bump.nextPossible, [
        {
          type: "minor",
          default: true,
        },
      ])
    ).toBe(true);
  });
});

/**
 * Some utilities have logging capabilities that needs to be
 * tested a little bit differently:
 * - mocking process.exit
 * - console.log
 * - inquirer.prompt
 */
describe("when testing for utilities with logging side-effects", () => {
  beforeEach(() => {
    mockExit = jest.fn();
    mockLog = jest.fn();
    mockLogError = jest.fn();
    mockLogWarning = jest.fn();
    mockPrompt = jest.fn(() => ({ goodToGo: true }));

    spyExit = jest.spyOn(process, "exit").mockImplementation(mockExit);
    spyLog = jest.spyOn(console, "log").mockImplementation(mockLog);
    spyLogError = jest.spyOn(console, "error").mockImplementation(mockLogError);
    spyLogWarning = jest
      .spyOn(console, "warn")
      .mockImplementation(mockLogWarning);
    spyPrompt = jest.spyOn(inquirer, "prompt").mockImplementation(mockPrompt);
  });
  afterEach(() => {
    spyExit.mockRestore();
    spyLog.mockRestore();
    spyLogError.mockRestore();
    spyLogWarning.mockRestore();
    spyPrompt.mockRestore();
  });

  it("should log a simple message", async () => {
    logger.log("Hello World");
    expect(mockLog).toHaveBeenCalledWith("Hello World");
    logger.log();
    expect(mockLog).toHaveBeenCalledWith("");
  });

  it("should display the proper error messages and exit with 0", async () => {
    displayErrorMessages(["message one", "message two"]);
    expect(mockLogError).toHaveBeenCalledWith("message one");
    expect(mockLogError).toHaveBeenCalledWith("message two");
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it("should not display any error messages and should not exit with 0", async () => {
    displayErrorMessages();
    expect(mockLogError).not.toHaveBeenCalled();
    expect(mockExit).not.toHaveBeenCalled();
  });

  it("should display an introduction message with dry-run mode ON", async () => {
    const version = 123;
    const branch = "master";
    const remote = "github";

    displayIntroductionMessage({ version, branch, remote });
    expect(mockLog).toHaveBeenCalledWith(`Current version is ${version}`);
    expect(mockLog).toHaveBeenCalledWith(`Current branch is ${branch}`);
    expect(mockLog).toHaveBeenCalledWith(
      `Current tracking remote is ${remote}`
    );
    expect(mockLogWarning).toHaveBeenCalledWith("Dry-run mode is ON");
  });

  it("should display an introduction message with dry-run mode OFF", async () => {
    const version = 123;
    const branch = "master";
    const remote = "github";
    const orginalDryRun = global["dry-run"];
    global["dry-run"] = false;

    displayIntroductionMessage({ version, branch, remote });
    expect(mockLog).toHaveBeenCalledWith(`Current version is ${version}`);
    expect(mockLog).toHaveBeenCalledWith(`Current branch is ${branch}`);
    expect(mockLog).toHaveBeenCalledWith(
      `Current tracking remote is ${remote}`
    );
    expect(mockLogWarning).not.toHaveBeenCalledWith("Dry-run mode is ON");
    global["dry-run"] = orginalDryRun;
  });

  it("should display a goodbye message and exit with 0", async () => {
    shouldContinue(false);
    expect(mockLog).toHaveBeenCalledWith("\nBye then!");
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it("should not display a goodbye message, not exit with 0 and should return true", async () => {
    const res = shouldContinue(true);
    expect(mockLog).not.toHaveBeenCalled();
    expect(mockExit).not.toHaveBeenCalled();
    expect(res).toBe(true);
  });

  it("should run preflight with errors for branch/remote", async () => {
    const config = {
      allowedBranches: ["maaaaster"],
      allowedRemotes: ["github/maaaaster"],
      bump: {
        local: true,
      },
    };
    const { branch, remote, version } = await preflightValidation(config);
    expect(branch).toBe("master");
    expect(remote).toBe("github/master");
    expect(version).toBe(currentVersion);

    expect(mockLogError).toHaveBeenCalledWith(
      'Working branch must be one of "maaaaster".'
    );
    expect(mockLogError).toHaveBeenCalledWith(
      'Tracking remote must be one of "github/maaaaster".'
    );
  });

  it("should display a confirmation message", async () => {
    const res = await displayConfirmation("confirmation message");
    expect(mockLog).toHaveBeenCalledWith("confirmation message");
    expect(res).toBe(true);
  });
});
