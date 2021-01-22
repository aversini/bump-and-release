module.exports = {
  allowedBranches: ["master"],
  allowedRemotes: ["github/master"],
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
  release: {
    local: false,
    commitMessage: (version) => `chore: tagging release ${version}`,
    prerelease: [],
    tag: {
      enabled: true,
      prefix: "v",
    },
  },
};
