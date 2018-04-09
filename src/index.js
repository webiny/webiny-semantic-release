import hookStd from "hook-std";

import getPackage from "./utils/getPackage";
import buildParams from "./utils/buildParams";
import stdOut from "./utils/stdOut";
import compose from "./utils/compose";

import verifyEnvironment from "./plugins/verifyEnvironment";
import analyzeCommits from "./plugins/analyzeCommits";
import githubVerify from "./plugins/github/verify";
import githubPublish from "./plugins/github/publish";
import npmVerify from "./plugins/npm/verify";
import npmPublish from "./plugins/npm/publish";
import releaseNotes from "./plugins/releaseNotes";
import updatePackageJSON from "./plugins/updatePackageJSON";

const release = async config => {
    const { params, plugins } = await buildParams(config);

    // Connect to the stdout and process each line of the output using `stdOut` function
    const unhook = hookStd({ silent: false }, stdOut);
    try {
        await compose([verifyEnvironment(), ...plugins])(params);
        unhook();
        return params;
    } catch (err) {
        unhook();
        throw err;
    }
};

export {
    release,
    analyzeCommits,
    githubVerify,
    githubPublish,
    npmVerify,
    npmPublish,
    releaseNotes,
    updatePackageJSON,
    getPackage
};
