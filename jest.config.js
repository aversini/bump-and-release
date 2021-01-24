module.exports = {
  /**
   * By default, Jest runs all tests and produces all errors into
   * the console upon completion. The bail config option can be
   * used here to have Jest stop running tests after n failures.
   * Setting bail to true is the same as setting bail to 1.
   * @type {Number | Boolean}
   *
   * Default: 0
   */
  bail: 5,

  /**
   * An array of glob patterns indicating a set of files for which
   * coverage information should be collected. If a file matches
   * the specified glob pattern, coverage information will be
   * collected for it even if no tests exist for this file and
   * it's never required in the test suite.
   * @type {Array}
   *
   * Default undefined
   */
  collectCoverageFrom: ["src/**/*.js"],

  /**
   * This will be used to configure minimum threshold enforcement
   * for coverage results. Thresholds can be specified as global,
   * as a glob, and as a directory or file path. If thresholds
   * aren't met, jest will fail. Thresholds specified as a
   * positive number are taken to be the minimum percentage
   * required. Thresholds specified as a negative number represent
   * the maximum number of uncovered entities allowed.
   * @type {Array}
   *
   * Default undefined
   */
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },

  /**
   * An array of file extensions your modules use. If you require
   * modules without specifying a file extension, these are the
   * extensions Jest will look for, in left-to-right order.
   * @type {Array}
   *
   * Default: ["js", "json", "jsx", "ts", "tsx", "node"]
   */
  moduleFileExtensions: ["js"],

  /**
   * Activates notifications for test results.
   * @type {Boolean}
   *
   * Default false
   */
  notify: false,

  /**
   * A list of paths to directories that Jest should use
   * to search for files in.
   * @type {Array}
   *
   * Default: ["<RootDir"]
   */
  roots: ["src"],

  /**
   * The glob patterns Jest uses to detect test files. By default
   * it looks for .js, .jsx, .ts and .tsx files inside of
   * __tests__ folders, as well as any files with a suffix of
   * .test or .spec (e.g. Component.test.js or Component.spec.js).
   * It will also find files called test.js or spec.js.
   * @type {Array}
   */
  testMatch: ["**/*.test.js"],
};
