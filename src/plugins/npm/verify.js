import execa from "execa";
import fs from "fs-extra";

export default () => {
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
            await fs.appendFile("./.npmrc", `\n//registry.npmjs.org/:_authToken=${NPM_TOKEN}`);
            await execa("npm", ["whoami"]);
            next();
        } catch (err) {
            throw new Error("EINVALIDNPMTOKEN: " + err.message);
        }
    };
};
