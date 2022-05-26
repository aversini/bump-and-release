# Bump and Release

![npm](https://img.shields.io/npm/v/bump-and-release?label=version&logo=npm)
![David](https://img.shields.io/david/aversini/bump-and-release?logo=npm)
![David](https://img.shields.io/david/dev/aversini/bump-and-release?logo=npm)
![GitHub Workflow Status](https://img.shields.io/github/workflow/status/aversini/bump-and-release/coverage?label=coverage&logo=github)

> Bump and Release is a tiny command line helper to bump and release packages.

## Installation

```sh
> cd your-project
> npm install --save-dev bump-and-release
```

## Configuration

Update your `package.json` file with the following scripts calls:

```json
"scripts": {
  "bump": "bump-and-release -t bump",
  "release": "bump-and-release-t release"
}
```

If you are using a configuration file, you can pass it via the parameter `-c`:

```json
"scripts": {
  "bump": "bump-and-release -t bump -c ./config/app-config.js",
  "release": "bump-and-release-t release -c ./config/app-config.js"
}
```

Or if you name it `.bump-and-release.config.js` and put it in the same location as your `package.json` file, it will be taken into account automatically.

This:

```json
  "bump": "bump-and-release -t bump -c .bump-and-release.config.js"
```

is equivalent to:

```json
  "bump": "bump-and-release -t bump"
```

if the file `.bump-and-release.config.js` can be found next to your `package.json`.

## Bump

By default, the "bump" command will:

1. Run the following preflight validations
   - check if the current branch name is `master`
   - check if the current branch has a tracking remote
   - check if that remote is either `github/master` or `origin/master`
   - check if your repo has uncommitted files
1. Prompt the user to choose from a list of possible "new versions"
   - patch
   - minor
   - major
1. Update your `package.json` file with the new version
1. Update your `package-lock.json` file with the new version
1. Stage and commit those files
1. Push to the tracking remote

If any of those tasks fail, the process stops.

### Bump example

<img height="451" width="810" src="https://raw.githubusercontent.com/aversini/bump-and-release/master/configuration/bump.png" alt="bump example">

## Release

By default, the "release" command will:

1. Run the following preflight validations
   - check if the current branch name is `master`
   - check if the current branch has a tracking remote
   - check if that remote is `github/master`or `origin/master`
   - check if your repo has uncommitted files
1. Stage and commit any modified files
1. Tag the version with the following template: `vCurrentVersion`
1. Push code and tags to the tracking remote

If any of those tasks fail, the process stops.

### Release example

<img height="451" width="810" src="https://raw.githubusercontent.com/aversini/bump-and-release/master/configuration/release.png" alt="release example">

## Custom configuration

While the defaults are pretty straight forward, it is possible to override them with a configuration file.

### Example

```js
module.exports = {
  /**
   * { array of strings }
   * List of all the branches this tool is NOT allowed to work with.
   * This entry takes precedence over the next one (allowedBranches).
   * This is ignored if bump.local or release.local is true.
   */
  disallowedBranches: [],
  /**
   * { array of strings }
   * List of all the branches this tool is allowed to work with.
   * This is ignored if bump.local or release.local is true.
   */
  allowedBranches: ["master", "main"],
  /**
   * { array of strings }
   * List of all the remotes this tool is allowed to work with.
   * This is ignored if bump.local or release.local is true.
   */
  allowedRemotes: ["github/master", "upstream/main"],

  /**
   * Configurations specific to the "bump" command.
   */
  bump: {
    /**
     * { boolean }
     * Flag indicating that this is a monorepo handled by Lerna with
     * non-independent version (all packages have the same version).
     * Bump will read lerna.json to find the current version, and the
     * location of all the packages listed in the prop "packages".
     * Bump will try to update ALL the packages.json under each and
     * every package listed in that prop.
     */
    lerna: true,
    /**
     * { boolean }
     * Flag indicating that all changes will remain
     * local, preventing anything to be pushed to the remote(s).
     */
    local: true,
    /**
     * { function }
     * Function that takes the new version as a parameter
     * and that returns the string that will be used during
     * the commit phase of the bump.
     */
    commitMessage: (version) =>
      `chore: bumping version for next release: ${version}`,
    /**
     * { array of objects }
     * List of possible "next" versions to be offered to
     * the user at the prompt. These values are the same
     * that are accepted from method `inc()` of the
     * node-semver library.
     * https://github.com/npm/node-semver
     * There is also an extra one called "custom", allowing
     * the user to enter a version manually.
     *
     * NOTE: there is a "special" case which is not a version.
     * It's used to add a separator when all the values are
     * displayed at the prompt.
     * The value for the type is "separator".
     */
    nextPossible: [
      {
        /**
         * { number }
         * The position of this prompt within other prompts.
         * The indexing starts at 0.
         */
        pos: 0,
        /**
         * { string }
         * The type of release as defined in node-semver.
         * Possible values are major, premajor, minor,
         * preminor, patch, prepatch or prerelease.
         * It also accepts "separator".
         */
        type: "prepatch",
        /**
         * { string }
         * Identifier to be used to prefix premajor,
         * preminor, prerelease or prepatch version increments.
         * For example: "alpha", "beta", "rc", etc.
         */
        identifier: "beta",
        /**
         * { boolean }
         * Flag to enable or disable a specific release.
         */
        enabled: true,
        /**
         * { boolean }
         * Flag to make that particular version the default
         * selection.
         */
        default: true,
        /**
         * { function }
         * Function that returns the prompted line for a
         * specific version.
         */
        prompt: (type, version) =>
          `[${type}] ... bump to next ${type} (${version})`,
        /**
         * { number }
         * The desired position for this specific release in
         * the prompt.
         */
      },
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
        type: "separator",
      },
      {
        type: "custom",
        prompt: (type) => `[${type}] ... enter a custom version`,
      },
    ],
    /**
     * { array of objects }
     * List of tasks to run before the bump is actually
     * executed. It is useful to run some tests, or
     * linting one last time for example. Each object has 3
     * keys: the name of the task, the action to run and
     * and optional verbose boolean to indicate if the
     * output of the task should be visible or not (it is
     * not verbose by default).
     *
     * NOTES: any files modified during these steps will
     * automatically be staged, committed and pushed to the
     * remote.
     */
    prebump: [
      {
        name: "run tests",
        command: "npm run test",
        verbose: true,
      },
      {
        name: "lint the files",
        command: "npm run lint",
      },
    ],
  },

  /**
   * Configurations specific to the "release" command.
   */
  release: {
    /**
     * { boolean }
     * Flag indicating that all changes will remain
     * local, preventing anything to be pushed.
     */
    local: true,
    /**
     * { function }
     * Function that takes the current version as a parameter
     * and that returns the string that will be used during
     * the commit phase of the release.
     */
    commitMessage: (version) => `chore: tagging release ${version}`,
    /**
     * { object }
     * Object specifying if this release should be tagged
     * (using the "enabled" boolean flag) and what prefix
     * to use when actually tagging (using the "prefix" string
     * flag).
     */
    tag: {
      enabled: true,
      prefix: "v",
    },
    /**
     * { array of objects }
     * List of tasks to run before the release is actually
     * tagged. It is useful to run some tests, or
     * generate a changelog for example. Each object has 3
     * keys: the name of the task, the action to run and
     * and optional verbose boolean to indicate if the
     * output of the task should be visible or not (it is
     * not verbose by default).
     *
     * NOTES: any files modified during these steps will
     * automatically be staged, committed and pushed to the
     * remote.
     */
    prerelease: [
      {
        name: "run tests",
        command: "npm run test",
        verbose: true,
      },
      {
        name: "generate changelog",
        command: "npm run changelog",
      },
    ],
  },
};
```

### Next Available Versions

The possible "next" versions to be offered to the user at the prompt are the same that are accepted from method `inc()` of the [node-semver library](https://github.com/npm/node-semver).

Here are possible values, assuming the current version of a package is 1.0.0.

| type     | current version | new version  |
| -------- | --------------- | ------------ |
| prepatch | 1.0.0           | 1.0.1-beta.0 |
| patch    | 1.0.0           | 1.0.1        |
| preminor | 1.0.0           | 1.1.0-beta.0 |
| minor    | 1.0.0           | 1.1.0        |
| premajor | 1.0.0           | 2.0.0-beta.0 |
| major    | 1.0.0           | 2.0.0        |

**NOTE**: the "beta" identifier can be customized by providing the key "identifier".

## License

MIT © Arno Versini
