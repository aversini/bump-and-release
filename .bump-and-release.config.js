module.exports = {
  bump: {
    nextPossible: [
      {
        type: "patch",
        prompt: (type, version) =>
          `[${type}] ... only defect fixes (${version})`,
      },
      {
        type: "minor",
        default: true,
        prompt: (type, version) =>
          `[${type}] ... at least one new feature (${version})`,
      },
      {
        type: "major",
        prompt: (type, version) =>
          `[${type}] ... breaking change(s) (${version})`,
      },
      {
        type: "custom",
        prompt: (type) => `[${type}] .. enter a custom version`,
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
