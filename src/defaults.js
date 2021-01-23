module.exports = {
  allowedBranches: ["master"],
  allowedRemotes: ["github/master", "origin/master"],
  bump: {
    local: false,
    commitMessage: (version) =>
      `chore: bumping version for next release: ${version}`,
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
        prompt: (type, version) =>
          `[${type}] ... bump to next ${type} (${version})`,
      },
      {
        type: "custom",
        prompt: (type) => `[${type}] .. enter your own custom version`,
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
