module.exports = {
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
