import { stub } from "sinon";
import proxyquire from "proxyquire";
import tempy from "tempy";
import clearModule from "clear-module";
import compose from "../src/utils/compose";
import fs from "fs-extra";
import "./utils/chai";

const env = { ...process.env };
const cwd = process.cwd();

describe("npmVerify plugin test", function() {
    let logger;
    let dir;
    const modulePath = "../src/plugins/npm/verify";

    beforeEach(async () => {
        clearModule(modulePath);
        dir = tempy.directory();
        process.chdir(dir);

        delete process.env["NPM_TOKEN"];

        logger = {
            log: stub(),
            error: stub()
        };
    });

    afterEach(() => {
        process.chdir(cwd);
        process.env = { ...env };
    });

    it("should skip verification if release is in `preview` mode", async () => {
        const { default: npmVerifyFactory } = await import(modulePath);

        const release = compose([npmVerifyFactory()]);

        const params = {
            logger,
            config: {
                preview: true
            }
        };

        return release(params).should.be.fulfilled;
    });

    it("should verify access to repository if valid token is set", async () => {
        process.env["NPM_TOKEN"] = "npm-token";

        proxyquire(modulePath, {
            execa: async () => {
                const npmrc = await fs.readFile("./.npmrc");
                if (npmrc.includes("//registry.npmjs.org/:_authToken=npm-token")) {
                    return true;
                }
                throw new Error("Command failed: npm whoami");
            }
        });

        const { default: npmVerifyFactory } = await import(modulePath);
        const release = compose([npmVerifyFactory()]);

        const params = {
            logger,
            config: {}
        };

        return release(params).should.be.fulfilled;
    });

    it("should throw error if token is not set", async () => {
        const { default: npmVerifyFactory } = await import(modulePath);

        const release = compose([npmVerifyFactory()]);

        const params = {
            logger,
            config: {}
        };

        return release(params).should.be.rejectedWith(Error, /ENONPMTOKEN/);
    });

    it("should throw error if invalid token is set", async () => {
        process.env["NPM_TOKEN"] = "invalid-npm-token";

        proxyquire(modulePath, {
            execa: async () => {
                throw new Error("Invalid token");
            }
        });

        const { default: npmVerifyFactory } = await import(modulePath);

        const release = compose([npmVerifyFactory()]);

        const params = {
            logger,
            config: {}
        };

        return release(params).should.be.rejectedWith(Error, /EINVALIDNPMTOKEN/);
    });
});
