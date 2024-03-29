module.exports = {
  bump: {
    local: true,
    nextPossible: [
      {
        pos: 0,
        default: true,
        type: "prepatch",
        identifier: "beta",
        prompt: (type, version) =>
          `[${type}] ..... development phase only (${version})`,
      },
      {
        pos: 1,
        type: "patch",
        prompt: (type, version) =>
          `[${type}] ........ only defect fixes (${version})`,
      },
      {
        pos: 2,
        type: "minor",
        prompt: (type, version) =>
          `[${type}] ........ at least one new feature (${version})`,
      },
      {
        pos: 3,
        type: "major",
        prompt: (type, version) =>
          `[${type}] ........ breaking change(s) (${version})`,
      },
      {
        pos: 4,
        type: "separator",
      },
      {
        pos: 5,
        type: "custom",
        prompt: (type) => `[${type}] ....... enter a custom version`,
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
      {
        name: "generate latest.md file",
        command: "npm run latest",
      },
    ],
  },
};
