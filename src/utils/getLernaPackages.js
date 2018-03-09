import Repository from "lerna/lib/Repository";
import PackageUtilities from "lerna/lib/PackageUtilities";

/**
 * Get packages from Lerna project.
 * @returns Array<{{name: string, location: string, packageJSON}}> Return all packages except those marked as 'private'.
 */
export default () => {
    const repository = new Repository();
    return PackageUtilities.getPackages(repository)
        .filter(pkg => !pkg.isPrivate())
        .map(pkg => {
            return {
                name: pkg.name,
                location: pkg.location,
                packageJSON: pkg.toJSON()
            };
        });
};
