const inquirer = require("inquirer");
const kleur = require("kleur");
const currentVersion = require("../../package.json").version;

const {
  displayConfirmation,
  displayIntroductionMessage,
  displayErrorMessages,
  getNextPossibleVersions,
  log,
  mergeConfigurations,
  preflightValidation,
  runCommand,
  shouldContinue,
  upperFirst,
  // private methods
  _getCurrentVersion,
} = require("../utilities");

const deepEqual = require("./helpers/deepEqual");

let mockExit, spyExit, mockLog, spyLog, mockPrompt, spyPrompt;

kleur.enabled = false;

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
    expect(stdout).toBe("hello");
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

  it("should return the corresponding choices for the next possible versions", async () => {
    const config = {
      bump: {
        nextPossible: [
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
      {
        value: null,
        short: "custom",
        name: "[custom] .. enter your own custom version",
      },
    ];
    const { choices, defaultChoice } = getNextPossibleVersions({
      current: "1.0.1",
      config,
    });
    expect(deepEqual(choices, expectedChoices)).toBe(true);
    expect(defaultChoice).toBe(2);
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
    spyExit = jest.spyOn(process, "exit").mockImplementation(mockExit);
    mockLog = jest.fn();
    spyLog = jest.spyOn(console, "log").mockImplementation(mockLog);
    mockPrompt = jest.fn(() => ({ goodToGo: true }));
    spyPrompt = jest.spyOn(inquirer, "prompt").mockImplementation(mockPrompt);
    global["dry-run"] = true;
  });
  afterEach(() => {
    spyExit.mockRestore();
    spyLog.mockRestore();
    spyPrompt.mockRestore();
  });

  it("should log a simple message", async () => {
    log("Hello World");
    expect(mockLog).toHaveBeenCalledWith("Hello World");
    log();
    expect(mockLog).toHaveBeenCalledWith();
  });

  it("should display the proper error messages and exit with 0", async () => {
    displayErrorMessages(["message one", "message two"]);
    expect(mockLog).toHaveBeenCalledWith("message one");
    expect(mockLog).toHaveBeenCalledWith("message two");
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it("should not display any error messages and should not exit with 0", async () => {
    displayErrorMessages();
    expect(mockLog).not.toHaveBeenCalled();
    expect(mockExit).not.toHaveBeenCalled();
  });

  it("should display and introduction message with dry-run mode ON", async () => {
    const version = 123;
    const branch = "master";
    const remote = "github";

    displayIntroductionMessage({ version, branch, remote });
    expect(mockLog).toHaveBeenCalledWith(`Current version is ${version}`);
    expect(mockLog).toHaveBeenCalledWith(`Current branch is ${branch}`);
    expect(mockLog).toHaveBeenCalledWith(
      `Current tracking remote is ${remote}`
    );
    expect(mockLog).toHaveBeenCalledWith("Dry-run mode is ON");
  });

  it("should display and introduction message with dry-run mode OFF", async () => {
    const version = 123;
    const branch = "master";
    const remote = "github";
    global["dry-run"] = false;

    displayIntroductionMessage({ version, branch, remote });
    expect(mockLog).toHaveBeenCalledWith(`Current version is ${version}`);
    expect(mockLog).toHaveBeenCalledWith(`Current branch is ${branch}`);
    expect(mockLog).toHaveBeenCalledWith(
      `Current tracking remote is ${remote}`
    );
    expect(mockLog).not.toHaveBeenCalledWith("Dry-run mode is ON");
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

    expect(mockLog).toHaveBeenCalledWith(
      'Working branch must be one of "maaaaster".'
    );
    expect(mockLog).toHaveBeenCalledWith(
      'Tracking remote must be one of "github/maaaaster".'
    );
  });

  it("", async () => {
    const res = await displayConfirmation("confirmation message");
    expect(mockLog).toHaveBeenCalledWith("confirmation message");
    expect(res).toBe(true);
  });
});