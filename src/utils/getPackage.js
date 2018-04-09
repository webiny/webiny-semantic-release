import readPkg from "read-pkg";

/**
 * Get a single package
 * @param config
 * @returns {{name: string, location: string, packageJSON}}
 */
export default (config = {}) => {
    const root = config.root || process.cwd();
    const pkg = readPkg.sync(root);
    return {
        name: pkg.name,
        location: root,
        packageJSON: pkg
    };
};
