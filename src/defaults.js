module.exports = {
  allowedBranches: ["master"],
  allowedRemotes: ["github/master", "origin/master", "upstream/master"],
  bump: {
    commitMessage: (version) =>
      `chore: bumping version for next release: ${version}`,
    lerna: false,
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
  disallowedBranches: [],
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
