const inquirer = require("inquirer");
const { deepEqual } = require("teeny-js-utilities");
const currentVersion = require("../../package.json").version;

const {
  BUMP_TYPE_CUSTOM,
  displayConfirmation,
  displayIntroductionMessage,
  getNextPossibleVersions,
  logger,
  mergeConfigurations,
  preflightValidation,
  prepareReleaseTasks,
  shouldContinue,
  // private methods
  _getCurrentVersion,
} = require("../utilities");

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

  it("should return the corresponding choices for the next possible versions", async () => {
    const config = {
      bump: {
        nextPossible: [
          {
            enabled: false,
            type: "prerelease",
          },
          {
            prompt: (type, version) =>
              `[${type}] ... bump to next ${type} (${version})`,
            type: "patch",
          },
          {
            prompt: (type, version) =>
              `[${type}] ... bump to next ${type} (${version})`,
            type: "minor",
          },
          {
            default: true,
            type: "major",
          },
          {
            prompt: (type) => `[${type}] .. enter your own custom version`,
            type: "custom",
          },
        ],
      },
    };
    const expectedChoices = [
      {
        name: "[patch] ... bump to next patch (1.0.2)",
        short: "patch",
        value: "1.0.2",
      },
      {
        name: "[minor] ... bump to next minor (1.1.0)",
        short: "minor",
        value: "1.1.0",
      },
      {
        name: "[major] ... bump to 2.0.0",
        short: "major",
        value: "2.0.0",
      },
      new inquirer.Separator(),
      {
        name: "[custom] .. enter your own custom version",
        short: "custom",
        value: BUMP_TYPE_CUSTOM,
      },
    ];
    const { choices, defaultChoice } = getNextPossibleVersions({
      config,
      current: "1.0.1",
    });
    expect(deepEqual(choices, expectedChoices)).toBe(true);
    // eslint-disable-next-line no-magic-numbers
    expect(defaultChoice).toBe(2);
  });

  it("should return the corresponding commands for the corresponding configuration", async () => {
    const config = {
      release: {
        commitMessage: (version) => `chore: tagging release ${version}`,
        local: false,
        prerelease: [
          {
            command: "npm run test",
          },
          {
            command: "npm run changelog",
            name: "generate changelog",
          },
          {
            command: "npm run bundlesize",
            name: "run bundlesize",
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
        "dry-run": true,
        name: "npm run test",
        verbose: false,
      },
      {
        action: "npm run changelog",
        "dry-run": true,
        name: "generate changelog",
        verbose: false,
      },
      {
        action: "npm run bundlesize",
        "dry-run": true,
        name: "run bundlesize",
        verbose: true,
      },
      { action: "git add -A", "dry-run": true, name: "git stage" },
      {
        action: 'git commit -m "chore: tagging release 6.6.6"',
        "dry-run": true,
        name: "git commit",
      },
      {
        action: 'git tag -a v6.6.6 -m "version 6.6.6"',
        "dry-run": true,
        name: "tag",
      },
      {
        action: "git push --no-verify && git push --tags --no-verify",
        "dry-run": true,
        name: "push",
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
        commitMessage: (version) => `chore: releasing version ${version}`,
        local: false,
        prerelease: [
          {
            command: "npm run test",
          },
          {
            command: "npm run changelog",
            name: "generate changelog",
          },
          {
            command: "npm run bundlesize",
            name: "run bundlesize",
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
        "dry-run": true,
        name: "npm run test",
        verbose: false,
      },
      {
        action: "npm run changelog",
        "dry-run": true,
        name: "generate changelog",
        verbose: false,
      },
      {
        action: "npm run bundlesize",
        "dry-run": true,
        name: "run bundlesize",
        verbose: true,
      },
      { action: "git add -A", "dry-run": true, name: "git stage" },
      {
        action: 'git commit -m "chore: releasing version 6.6.6"',
        "dry-run": true,
        name: "git commit",
      },
      {
        action: "git push --no-verify",
        "dry-run": true,
        name: "push",
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
        commitMessage: (version) => `chore: releasing version ${version}`,
        local: true,
        prerelease: [
          {
            command: "npm run test",
          },
          {
            command: "npm run changelog",
            name: "generate changelog",
          },
          {
            command: "npm run bundlesize",
            name: "run bundlesize",
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
        "dry-run": true,
        name: "npm run test",
        verbose: false,
      },
      {
        action: "npm run changelog",
        "dry-run": true,
        name: "generate changelog",
        verbose: false,
      },
      {
        action: "npm run bundlesize",
        "dry-run": true,
        name: "run bundlesize",
        verbose: true,
      },
      { action: "git add -A", "dry-run": true, name: "git stage" },
      {
        action: 'git commit -m "chore: releasing version 6.6.6"',
        "dry-run": true,
        name: "git commit",
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
            default: true,
            type: "minor",
          },
        ],
      },
      release: {
        prerelease: [
          {
            command: "npm run test",
            name: "run tests",
          },
          {
            command: "npm run changelog",
            name: "generate changelog",
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
            default: true,
            type: "minor",
          },
        ],
      },
      release: {
        prerelease: [
          {
            command: "npm run test",
            name: "run tests",
          },
          {
            command: "npm run changelog",
            name: "generate changelog",
          },
        ],
      },
    };
    const configB = {
      bump: {
        nextPossible: [
          {
            default: false,
            type: "minor",
          },
        ],
      },
      release: {
        prerelease: [
          {
            command: "npm run test",
            name: "run tests",
          },
          {
            command: "npm run changelog",
            name: "generate changelog",
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
            default: true,
            type: "minor",
          },
        ],
      },
    };
    const configB = {
      bump: {
        nextPossible: [
          {
            default: false,
            type: "minor",
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
            default: false,
            type: "minor",
          },
        ],
      },
    };
    const configB = {
      bump: {
        nextPossible: [
          {
            default: true,
            type: "minor",
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
          default: true,
          type: "minor",
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

  it("should display an introduction message with dry-run mode ON", async () => {
    const version = 123;
    const branch = "master";
    const remote = "github";

    displayIntroductionMessage({ branch, remote, version });
    const res = `Current version is 123
Current branch is master
Current tracking remote is github
Dry-run mode is ON`;
    expect(mockLog).toHaveBeenCalledWith(res);
  });

  it("should display an introduction message with dry-run mode OFF", async () => {
    const version = 123;
    const branch = "master";
    const remote = "github";
    const orginalDryRun = global["dry-run"];
    global["dry-run"] = false;

    displayIntroductionMessage({ branch, remote, version });
    const res = `Current version is 123
Current branch is master
Current tracking remote is github`;
    expect(mockLog).toHaveBeenCalledWith(res);
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
