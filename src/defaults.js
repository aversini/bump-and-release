module.exports = {
  allowedBranches: ["master"],
  allowedRemotes: ["github/master", "origin/master"],
  bump: {
    commitMessage: (version) =>
      `chore: bumping version for next release: ${version}`,
    local: false,
    nextPossible: [
      {
        prompt: (type, version) =>
          `[${type}] ... bump to next ${type} (${version})`,
        type: "patch",
      },
      {
        prompt: (type, version) =>
          `[${type}] ... bump to next ${type} (${version})`,
        type: "minor",
      },
      {
        prompt: (type, version) =>
          `[${type}] ... bump to next ${type} (${version})`,
        type: "major",
      },
      {
        prompt: (type) => `[${type}] .. enter your own custom version`,
        type: "custom",
      },
    ],
    prebump: [],
  },
  release: {
    commitMessage: (version) => `chore: tagging release ${version}`,
    local: false,
    prerelease: [],
    tag: {
      enabled: true,
      prefix: "v",
    },
  },
};
