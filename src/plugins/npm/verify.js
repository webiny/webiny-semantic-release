import execa from "execa";
import fs from "fs-extra";

export default (config = {}) => {
    const { registry = "https://registry.npmjs.org" } = config;

    return async ({ logger, config }, next) => {
        if (config.preview) {
            return next();
        }

        const { NPM_TOKEN } = process.env;
        if (!NPM_TOKEN) {
            throw new Error("ENONPMTOKEN: Missing NPM_TOKEN in process.env!");
        }

        logger.log("Verifying access to NPM...");
        try {
            await fs.appendFile("./.npmrc", `\n${registry}/:_authToken=${NPM_TOKEN}`);
            // We need to unset the `npm_` env variables to make sure local `.npmrc` is being read.
            // This is required when running scripts with yarn: https://github.com/yarnpkg/yarn/issues/4475
            await execa.shell(
                `unset $(env | awk -F= '$1 ~ /^npm_/ {print $1}') & npm whoami --registry ${registry}`
            );
            next();
        } catch (err) {
            throw new Error("EINVALIDNPMTOKEN: " + err.message);
        }
    };
};
