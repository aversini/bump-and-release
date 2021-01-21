module.exports = {
  bump: {
    local: false,
    commitMessage: (version) =>
      `chore: bumping version for next release: ${version}`,
    nextPossible: [
      {
        type: "patch",
      },
      {
        type: "minor",
      },
      {
        type: "major",
      },
    ],
  },
};
