const inquirer = require("inquirer");
const currentVersion = require("../../package.json").version;

const release = require("../release");
const defaultConfig = require("../defaults");

let mockExit, spyExit, mockLog, spyLog, mockPrompt, spyPrompt;

describe("when testing for bump with logging side-effects", () => {
  beforeEach(() => {
    mockExit = jest.fn();
    spyExit = jest.spyOn(process, "exit").mockImplementation(mockExit);
    mockLog = jest.fn();
    spyLog = jest.spyOn(console, "log").mockImplementation(mockLog);
    mockPrompt = jest.fn(() => ({ goodToGo: true }));
    spyPrompt = jest.spyOn(inquirer, "prompt").mockImplementation(mockPrompt);
  });
  afterEach(() => {
    spyExit.mockRestore();
    spyLog.mockRestore();
    spyPrompt.mockRestore();
  });

  it("should run release with the default configuration and dry-run mode is ON", async () => {
    await release(defaultConfig);
    expect(mockLog).toHaveBeenCalledWith(
      `Current version is ${currentVersion}`
    );
    expect(mockLog).toHaveBeenCalledWith("Dry-run mode is ON");
  });
});
