const inquirer = require("inquirer");
const currentVersion = require("../../package.json").version;

const release = require("../release");
const defaultConfig = require("../defaults");

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

describe("when testing for bump with logging side-effects", () => {
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

  it("should run release with the default configuration and dry-run mode is ON", async () => {
    await release(defaultConfig);
    const res = `Current version is ${currentVersion}
Current branch is master
Current tracking remote is github/master
Dry-run mode is ON`;
    expect(mockLog).toHaveBeenCalledWith(res);
  });
});
