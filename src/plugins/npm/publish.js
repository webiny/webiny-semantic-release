import execa from "execa";
import path from "path";
import fs from "fs-extra";

export default (config = {}) => {
    const { registry, tag } = config;

    return async ({ packages, logger, config }, next) => {
        for (let i = 0; i < packages.length; i++) {
            const pkg = packages[i];
            if (!pkg.nextRelease || !pkg.nextRelease.version) {
                continue;
            }

            logger.log(
                "Publishing %s version %s to npm registry" + (registry ? " %s" : ""),
                ...[pkg.name, pkg.nextRelease.version, registry].filter(v => v)
            );

            const command = [
                `npm publish`,
                tag ? `--tag ${tag}` : null,
                registry ? `--registry ${registry}` : null,
                pkg.location
            ]
                .filter(v => v)
                .join(" ");

            if (config.preview) {
                logger.log(`DRY: %s`, command);
            } else {
                try {
                    // write the updated package.json to disk before publishing
                    fs.writeJsonSync(path.join(pkg.location, "package.json"), pkg.package, {
                        spaces: 2
                    });
                    // We need to unset the `npm_` env variables to make sure local `.npmrc` is being read.
                    // This is required when running scripts with yarn: https://github.com/yarnpkg/yarn/issues/4475
                    const shell = await execa.shell(
                        `unset $(env | awk -F= '$1 ~ /^npm_/ {print $1}') && ${command}`
                    );
                    logger.log(shell.stdout);
                    pkg.npmPublish = {
                        ...shell
                    };
                } catch (err) {
                    logger.log(err.toString());
                    pkg.npmPublish = { error: err };
                }
            }
        }

        next();
    };
};
