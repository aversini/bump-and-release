module.exports = {
  parser: "babel-eslint",
  root: true,
  env: {
    es6: true,
    browser: true,
    builtin: true,
    mocha: true,
  },
  globals: {
    chai: false,
    jest: false,
  },
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
  },
  extends: [
    "./rules/reset.js",
    "./rules/style/on.js",
    "./rules/best-practices/on.js",
    "./rules/possible-errors/on.js",
    "./rules/variables/on.js",
    "./rules/es6/on.js",
    "./rules/node/on.js",
  ],
};
