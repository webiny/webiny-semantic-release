import chai from "./utils/chai";
import buildParams from "../src/utils/buildParams";
import Git from "./../src/utils/git";

const { assert } = chai;

describe("build params test", () => {
    const tagFormat = pkg => pkg.name + "@v${version}";

    it("should build a valid default `params` object", async () => {
        const config = {
            packages: [{ name: "package-1", location: "", packageJSON: {} }],
            tagFormat
        };

        const { params } = await buildParams(config);

        assert.instanceOf(params.packages, Array);
        assert.hasAllKeys(params.logger, ["log", "error"]);
        assert.isFunction(params.logger.log);
        assert.isFunction(params.logger.error);
        assert.instanceOf(params.git, Git);
        assert.isTrue(params.config.ci);
        assert.isFalse(params.config.preview);
        assert.isString(params.config.repositoryUrl);
        assert.equal(params.config.branch, "master");
        assert.isFunction(params.config.tagFormat);
        assert.equal(params.config.tagFormat({ name: "test" }), "test@v${version}");
    });

    it("should load a package from cwd() if no packages are defined", async () => {
        return buildParams({ tagFormat }).should.be.fulfilled.then(({ params }) => {
            assert.lengthOf(params.packages, 1);
            assert.equal(params.packages[0].name, "webiny-semantic-release");
        });
    });

    it("should build a valid `params` object from given config 1", async () => {
        const config = {
            ci: false,
            logger: { log: l => l, error: e => e },
            preview: true,
            repositoryUrl: "test",
            branch: "development",
            packages: [{ name: "package-1", location: "", packageJSON: {} }],
            tagFormat
        };

        const { params } = await buildParams(config);

        assert.instanceOf(params.packages, Array);
        assert.hasAllKeys(params.logger, ["log", "error"]);
        assert.isFunction(params.logger.log);
        assert.isFunction(params.logger.error);
        assert.equal(params.logger.log("log"), "log");
        assert.equal(params.logger.error("err"), "err");
        assert.instanceOf(params.git, Git);
        assert.isFalse(params.config.ci);
        assert.isTrue(params.config.preview);
        assert.isString(params.config.repositoryUrl);
        assert.equal(params.config.repositoryUrl, "test");
        assert.equal(params.config.branch, "development");
        assert.isFunction(params.config.tagFormat);
    });

    it("should build a valid `params` object from given config 2", async () => {
        const config = {
            ci: false,
            logger: { log: l => l, error: e => e },
            preview: true,
            repositoryUrl: "test",
            branch: "development",
            packages: [{ name: "package-1", location: "", packageJSON: {} }],
            tagFormat
        };

        const { params } = await buildParams(config);

        assert.instanceOf(params.packages, Array);
        assert.hasAllKeys(params.logger, ["log", "error"]);
        assert.isFunction(params.logger.log);
        assert.isFunction(params.logger.error);
        assert.equal(params.logger.log("log"), "log");
        assert.equal(params.logger.error("err"), "err");
        assert.instanceOf(params.git, Git);
        assert.isFalse(params.config.ci);
        assert.isTrue(params.config.preview);
        assert.isString(params.config.repositoryUrl);
        assert.equal(params.config.repositoryUrl, "test");
        assert.equal(params.config.branch, "development");
        assert.isFunction(params.config.tagFormat);
        assert.equal(params.config.tagFormat({ name: "test" }), "test@v${version}");
    });

    it("should convert `tagFormat` string into a function", async () => {
        const config = {
            packages: [{ name: "package-1", location: "", packageJSON: {} }],
            tagFormat: "v${version}"
        };

        const { params } = await buildParams(config);

        assert.equal(params.config.tagFormat({ name: "test" }), "v${version}");
    });

    it("should use the given `tagFormat` function", async () => {
        const config = {
            packages: [{ name: "package-1", location: "", packageJSON: {} }],
            tagFormat
        };

        const { params } = await buildParams(config);

        assert.equal(params.config.tagFormat({ name: "test" }), "test@v${version}");
    });

    it("should convert a single package to an array of packages", async () => {
        const pkg1 = { name: "package-1", location: "", packageJSON: {} };
        const { params } = await buildParams({
            packages: pkg1,
            tagFormat
        });

        assert.deepEqual(params.packages, [pkg1]);
    });

    it("should throw error if an empty array of packages is passed", () => {
        return buildParams({ tagFormat: "v${version}", packages: [] }).should.be.rejectedWith(
            Error,
            /ENOPACKAGES/
        );
    });

    it("should throw error if an invalid package structure is found", async () => {
        const config1 = { packages: [{ name: "package-1" }], tagFormat };
        const config2 = { packages: [{ packageJSON: "package-1" }], tagFormat };
        const config3 = { packages: [{ location: "package-1" }], tagFormat };

        return Promise.all([
            buildParams(config1).should.be.rejectedWith(Error, /EINVALIDPACKAGE/),
            buildParams(config2).should.be.rejectedWith(Error, /EINVALIDPACKAGE/),
            buildParams(config3).should.be.rejectedWith(Error, /EINVALIDPACKAGE/)
        ]);
    });

    it("should throw error if `tagFormat` is not defined", async () => {
        return buildParams({}).should.be.rejectedWith(Error, /ENOTAGFORMAT/);
    });
});
