# webiny-semantic-release
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://prettier.io)
[![license](https://img.shields.io/badge/license-MIT-green.svg)](https://github.com/webiny/webiny-semantic-release/blob/master/LICENSE)

| Branch | Build | Coverage |
| :--- | :---: | :--- |
| master (latest release) | [![Build Status](https://travis-ci.org/Webiny/webiny-semantic-release.svg?branch=master)](https://travis-ci.org/Webiny/webiny-semantic-release) | [![Coverage Status](https://coveralls.io/repos/github/Webiny/webiny-semantic-release/badge.svg?branch=master)](https://coveralls.io/github/Webiny/webiny-semantic-release?branch=master) |
| development (active development) | [![Build Status](https://travis-ci.org/Webiny/webiny-semantic-release.svg?branch=development)](https://travis-ci.org/Webiny/webiny-semantic-release) | [![Coverage Status](https://coveralls.io/repos/github/Webiny/webiny-semantic-release/badge.svg?branch=development)](https://coveralls.io/github/Webiny/webiny-semantic-release?branch=development) |

A tool for automated and reliable versioning inspired by `semantic-release`.

- supports single package repositories
- supports monorepo structure (Lerna or custom)
- supports plugins and 100% customizable release/publish process
- detailed preview of actual release (dry run) if you want to preview what is about to happen

## Why not simply use `semantic-release`?
Kudos to the `semantic-release` team for starting this movement!
We greatly support it and think it is a very important step towards a stable open-source ecosystem.

But the primary problem for us was - it does not support monorepos.
We did try to wrap it with some custom logic to make it work in a monorepo environment but we very soon hit a wall.
We gave up when we had to update versions of inter-dependent packages (when one of the packages in your monorepo depends on another package in te same monorepo).
There were also other problems, but these were the deciding ones.

Still, we use 2 of their plugins to analyze commits and generate release notes by simply wrapping them with our own plugins (read further) and adding some bells and whistles.

## How to use
We provide a set of plugins you can use to get started quickly.
Plugins are listed in the recommended order:

| Order | Plugin | Description |
| :---: | :---: | :--- |
| 1. | githubVerify | verifies `GH_TOKEN` or `GITHUB_TOKEN` and repo permissions. |
| 2. | npmVerify | verifies `NPM_TOKEN`. |
| 3. | analyzeCommits | analyzes commit history and determines version type. |
| 4. | updatePackageJSON | updates package version and versions of dependencies. |
| 5. | releaseNotes | generates release notes for GitHub release. |
| 6. | githubPublish | publishes a new release to GitHub. |
| 7. | npmPublish | publishes the package to npm. |


```js
// We are using `require` to avoid having to transpile the code
const wsr = require("webiny-semantic-release");

// NOTE: you are responsible for defining an array of packages!
// This makes this tool very flexible as it does not care about your project structure,
// only about the packages you pass to it.

// For single package repos the package will be loaded automatically

// For Lerna packages read the section below

// For custom project structures you just need to specify your packages using the following template:
const projectPackages = [
    {
        name: 'package-1',
        location: '/my/project/packages/package-1',
        packageJSON: {
            // Here goes the ENTIRE content of `package.json` file
            name: 'package-1',
            version: '0.0.0-semantically-released',
            dependencies: {},
            // ...
        }
    }
];

// Run release (returns a Promise)
wsr.release({
    ci: true,
    preview: false,
    branch: 'master',
    packages: projectPackages,
    plugins: [
        wsr.githubVerify(),
        wsr.npmVerify(),
        wsr.analyzeCommits(),
        wsr.releaseNotes(),
        wsr.updatePackageJSON(),
        wsr.githubPublish(),
        wsr.npmPublish()
    ]
}).catch(err => {
    console.log(err);
    process.exit(1);
});
```

### Lerna packages
We did not include `lerna` as a dependency to keep things simple.
Loading packages yourself is simple enough, here is a working example:

```js
import Repository from "lerna/lib/Repository";
import PackageUtilities from "lerna/lib/PackageUtilities";

const packages = PackageUtilities.getPackages(new Repository())
    .filter(pkg => !pkg.isPrivate()) // do not include private packages
    .map(pkg => {
        return {
            name: pkg.name,
            location: pkg.location,
            packageJSON: pkg.toJSON()
        };
    });
```

### Plugin system
Our plugin system is very straightforward. It works almost the same way `express` middleware does.
Under the hood we use a very simple tool to compose middleware functions using arbitrary `params`, a `next` callback and a `finish` callback.
`params` are passed to each consecutive plugin and are mutable so all plugins share data and can modify data.

These Flow types will make everything much clearer:

```flow
declare type Package = {
    name: string,
    location: string,
    packageJSON: Object
};

declare type Params = {
    packages: Array<Package>,
    logger: { log: Function, error: Function },
    git: Object,
    config: {
        ci: Boolean,
        preview: Boolean,
        repositoryUrl: string,
        branch: string,
        tagFormat: string | (pkg: Package) => string
    }
};

declare type Plugin = (params: Params, next: Function, finish: Function) => void;
```

### Creating a plugin
To create a plugin you need to defined a simple function of type `Plugin` (see the Flow types above).

Let's create a plugin which checks all the packages for the presence of `README.md` file:

```js
import path from "path";
import fs from "fs";

// I always recommend to export a factory function which can optionally take a config object.
// That way you are safe for possible future upgrades or parameters.
export default () => {
    return ({packages, logger}, next, finish) => {
        let errors = [];
        packages.map(pkg => {
            if (!fs.existsSync(path.join(pkg.location, "README.md"))) {
                errors.push(pkg.name);
            }
        });

        if (errors.length) {
            logger.error(
                "Missing README.md file in the following packages:\n\t- %s",
                errors.join("\n- ")
            );
			return finish();
        }
        next();
    }
};
```

### Adding custom plugins to the release process

If you want to create your own publishing process and maybe remove or add some of the plugins, you can do it like this:

```js
// We will remove the `npm` plugins, and instead add 2 new plugins

const wsr = require("webiny-semantic-release");

wsr.release({
    preview: true,
    plugins: [
        wsr.githubVerify(),
        checkReadmeFile(), // Use your new plugin for README.md verification (see "Creating a plugin")
        wsr.analyzeCommits(),
        wsr.releaseNotes(),
        // This plugin will modify the release notes of each package and add a custom footer.
        // After the `releaseNotes` plugin did its job, each package `nextRelease` will contain a `notes` key with the generated notes.
        ({packages}, next) => {
            packages.map(pkg => {
                pkg.nextRelease && pkg.nextRelease.notes += "\nI MUST have this at the bottom of each release!"
            });
            next();
        },
        // Publish plugin will now use the new `notes` because they were modified by your plugin
        wsr.githubPublish()
    ]
}).catch(err => {
    console.error(err);
    process.exit(1);
});
```

### Filtering relevant commits
If you are working with multiple packages you will probably want to filter the commits so that each package is processed with only the commits that are relevant to that package.
To configure the logic for filtering records configure the plugin like this:

```js
...
// This will filter the commits by the presence of `affects: pkg1, pkg2, pkg3...` string in the commit message.
// If you are using `cz-lerna-changelog` for commitizen, you will have exactly this in your commit messages.
wsr.analyzeCommits({
    isRelevant: (pkg, commit) => {
        if (commit.message.match(/affects:(.*)/)) {
            return RegExp.$1.split(",").map(n => n.trim()).filter(name => pkg.name === name).length;
        }
    }
})
...
```

### Configuring the `analyzeCommits` plugin
We are using the `@semantic-release/commit-analyzer` plugin under the hood of our `analyzeCommits` plugin.
If you need, you can pass the config to that `semantic-release` plugin by passing a `commitAnalyzer` config object.
For all the config options visit [@semantic-release/commit-analyzer](https://github.com/semantic-release/commit-analyzer#options)

```js
...
wsr.analyzeCommits({
    commitAnalyzer: {
        "preset": "angular",
        "releaseRules": [
            {"type": "docs", "scope":"README", "release": "patch"},
            {"type": "refactor", "release": "patch"},
            {"type": "style", "release": "patch"}
        ],
        "parserOpts": {
            "noteKeywords": ["BREAKING CHANGE", "BREAKING CHANGES", "BREAKING"]
        }
    }
})
...
```
