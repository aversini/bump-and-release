# [1.2.0](https://github.com/aversini/bump-and-release/compare/v1.1.0...v1.2.0) (2021-01-30)


### Bug Fixes

* using execa for simpler child_process command manipulation ([fa4a406](https://github.com/aversini/bump-and-release/commit/fa4a4069286a0046f76e8116a4b0fc9ead503824))


### Features

* using boxen for a better summary display ([03df431](https://github.com/aversini/bump-and-release/commit/03df43101f55f91922781109c0cef837e77056ce))


### Reverts

* reverting move to execa since it's breaking some git commands ([1a46359](https://github.com/aversini/bump-and-release/commit/1a46359bf52dd45f160cba27099e5936b074e12a))



# [1.1.0](https://github.com/aversini/bump-and-release/compare/v1.0.0...v1.1.0) (2021-01-30)


### Features

* migrating to teeny-logger for consistent logging on the console ([11a1e3d](https://github.com/aversini/bump-and-release/commit/11a1e3d74b074eaf3df5594e24b64a1fb4b4efc5))



# [1.0.0](https://github.com/aversini/bump-and-release/compare/v0.7.0...v1.0.0) (2021-01-29)


### Features

* **bump:** adding separator between semver versions and custom ([b2eec52](https://github.com/aversini/bump-and-release/commit/b2eec528c87360275cfcd2d49abc970b72104374))



# [0.7.0](https://github.com/aversini/bump-and-release/compare/v0.6.0...v0.7.0) (2021-01-28)


### Bug Fixes

* **Bump:** type "custom" is completely broken ([f555359](https://github.com/aversini/bump-and-release/commit/f5553595e3945450df0c70d9fb403cf05ee9fbda))



# [0.6.0](https://github.com/aversini/bump-and-release/compare/v0.5.1...v0.6.0) (2021-01-25)


### Bug Fixes

* dry-run mode warning is not prominent enough ([9f4b168](https://github.com/aversini/bump-and-release/commit/9f4b168fe0c2688f07806230049e20a6ee3f3f26))
* throw and error and exit if the provided config file does not exist ([c51ea00](https://github.com/aversini/bump-and-release/commit/c51ea00ba9cbe45a276b61f640f11bef1f884252))


### Features

* auto detection of user config at the root of working dir ([ce64d73](https://github.com/aversini/bump-and-release/commit/ce64d73d4197975470febec33263cb5d98d340a9))



## [0.5.1](https://github.com/aversini/bump-and-release/compare/v0.5.0...v0.5.1) (2021-01-24)


### Bug Fixes

* error messages should be red, not orange ([f7d1af2](https://github.com/aversini/bump-and-release/commit/f7d1af2c8f4e32c74ef3494c7877d26a9db1dd57))



# [0.5.0](https://github.com/aversini/bump-and-release/compare/v0.4.0...v0.5.0) (2021-01-23)


### Features

* if dry-run mode is ON, add it to the introduction message ([af9d761](https://github.com/aversini/bump-and-release/commit/af9d761d50880d4bd7873b5f9778e2f640039cde))
* **bump:** adding more customization for the "nextVersion" options ([0c050dc](https://github.com/aversini/bump-and-release/commit/0c050dc9e8cdd07947df4a6ebd58869154bdcb83))



# [0.4.0](https://github.com/aversini/bump-and-release/compare/v0.3.2...v0.4.0) (2021-01-22)


### Features

* **release:** adding support for verbose actions ([40ba29f](https://github.com/aversini/bump-and-release/commit/40ba29fd5aa17394e71fb68ead43136e3163cc38))


### Reverts

* Revert "chore: tagging release 0.3.1" ([2dabaf4](https://github.com/aversini/bump-and-release/commit/2dabaf4e2d41ef0853814b64591461cc1a9b97bb))
* Revert "chore: tagging release 0.3.2" ([b9d3095](https://github.com/aversini/bump-and-release/commit/b9d3095ba8032f9b68e0831792904fe9e7ea0723))



## [0.3.1](https://github.com/aversini/bump-and-release/compare/v0.3.0...v0.3.1) (2021-01-22)


### Bug Fixes

* adding "origin" as a default allowed remote ([98d008d](https://github.com/aversini/bump-and-release/commit/98d008d6c3a30e26433eb946e3261b77dbc82ed0))
* allowedBranches and allowedRemotes logic was broken for more than one ([9160e78](https://github.com/aversini/bump-and-release/commit/9160e786e763f89be4bdcb4677cd72a617e738d2))



# [0.3.0](https://github.com/aversini/bump-and-release/compare/v0.2.1...v0.3.0) (2021-01-22)


### Features

* allowed remotes and allowed branches are now configurable ([ac3c6a5](https://github.com/aversini/bump-and-release/commit/ac3c6a506fffdbdb0da5a121caff374ce25c008c))



## [0.2.1](https://github.com/aversini/bump-and-release/compare/v0.2.0...v0.2.1) (2021-01-21)


### Bug Fixes

* **release:** spinner for push should say "Pushing to remote..." ([ca4a1d5](https://github.com/aversini/bump-and-release/commit/ca4a1d51a6daae87bd36fe012881d8163ba01a9c))



# [0.2.0](https://github.com/aversini/bump-and-release/compare/v0.1.3...v0.2.0) (2021-01-21)


### Features

* adding support for "dry-run" ([b4afeca](https://github.com/aversini/bump-and-release/commit/b4afecaaf175d7dd8f460c7406ded3dcac8ee2cf))



## [0.1.3](https://github.com/aversini/bump-and-release/compare/v0.1.2...v0.1.3) (2021-01-21)

### Bug Fixes

- **release:** capitalize command name at the prompt ([863f4a3](https://github.com/aversini/bump-and-release/commit/863f4a38916295b82a8888a7df29d36c5c1b8dc1))

## [0.1.2](https://github.com/aversini/bump-and-release/compare/v0.1.1...v0.1.2) (2021-01-21)

### Bug Fixes

- **release:** no more false positive error on empty commit ([6577810](https://github.com/aversini/bump-and-release/commit/6577810497f93fc4c83598b6215b6d6cbec1e606))
- **release:** trying to fix stage and commit by separating them ([bf9b16b](https://github.com/aversini/bump-and-release/commit/bf9b16b23b01e179d0ea58f5a664c97a1d7cd1d2))
- adding try catch to release task execution ([bcb50e3](https://github.com/aversini/bump-and-release/commit/bcb50e388540a4f459cafdc2f4d04339031bb521))
- if at least one release task fails, do not end with a success message ([3102eb1](https://github.com/aversini/bump-and-release/commit/3102eb140ba1a12c6680461cbff7140bfcba0e88))
- release tasks need to run in sequence ([771a31d](https://github.com/aversini/bump-and-release/commit/771a31d711e8bde101b6200722e36685eda56502))

## 0.0.1 (2021-01-21)

### Features

- adding support for bump and configuration ([0145115](https://github.com/aversini/bump-and-release/commit/0145115a75fbadda04ed32b4d87aeaa2eaeb0c6c))
