import Git from "./git";
import logger from "./logger";
import getPackage from "./getPackage";

export default async config => {
    const git = config.git || new Git();
    const tagFormat = (() => {
        if (typeof config.tagFormat === "function") {
            return config.tagFormat;
        }

        if (typeof config.tagFormat === "string") {
            return () => config.tagFormat;
        }

        throw new Error("ENOTAGFORMAT: Missing `tagFormat` parameter.");
    })();

    const params = {
        logger: config.logger || logger(),
        git,
        config: {
            ci: typeof config.ci !== "undefined" ? config.ci : true,
            preview: typeof config.preview !== "undefined" ? config.preview : false,
            repositoryUrl: config.repositoryUrl || (await git.repoUrl()),
            branch: config.branch || "master",
            tagFormat
        }
    };

    if (!config.packages) {
        params.packages = [getPackage()];
    } else {
        params.packages = Array.isArray(config.packages) ? config.packages : [config.packages];
    }

    if (!params.packages.length) {
        throw new Error(`ENOPACKAGES: missing packages to process.`);
    }

    // Verify packages data structure
    params.packages.map(pkg => {
        if (
            !pkg.hasOwnProperty("name") ||
            !pkg.hasOwnProperty("packageJSON") ||
            !pkg.hasOwnProperty("location")
        ) {
            throw new Error(
                `EINVALIDPACKAGE: Packages MUST contain \`name\`, \`location\` and \`packageJSON\` keys.`
            );
        }
    });

    return { params, plugins: config.plugins };
};
