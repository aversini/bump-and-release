const inquirer = require("inquirer");
const kleur = require("kleur");
const currentVersion = require("../../package.json").version;

const bump = require("../bump");
const defaultConfig = require("../defaults");

let mockExit, spyExit, mockLog, spyLog, mockPrompt, spyPrompt;

kleur.enabled = false;

describe("when testing for bump with logging side-effects", () => {
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

  it("should run bump with the default configuration and drr-run mode is ON", async () => {
    await bump(defaultConfig);
    expect(mockLog).toHaveBeenCalledWith(
      `Current version is ${currentVersion}`
    );
    expect(mockLog).toHaveBeenCalledWith("Dry-run mode is ON");
  });
});
