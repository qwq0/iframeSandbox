import fs from "fs/promises";
import * as rollup from "rollup";
import * as terser from "terser";


(async () =>
{
    // build sanboxWorker
    try
    {
        let bundle = await rollup.rollup({
            input: "./src/worker/sandboxWorker.js"
        });
        let codeStr = (await bundle.generate({ format: "iife" })).output[0].code;
        await bundle.close();
        let minifyCodeStr = (await terser.minify(codeStr, {
            compress: true,
            mangle: true
        })).code;
        await fs.writeFile("./generate/sandboxWorkerScript.js", `export let sandboxWorkerScript = ${JSON.stringify(minifyCodeStr)};`);
    }
    catch (error)
    {
        console.error(error);
        process.exit(-1);
    }

    // build sandbox
    try
    {
        let bundle = await rollup.rollup({
            input: "./src/sandbox/sandbox.js"
        });
        let codeStr = (await bundle.generate({ format: "iife" })).output[0].code;
        await bundle.close();
        let minifyCodeStr = (await terser.minify(codeStr, {
            compress: true,
            mangle: true
        })).code;
        await fs.writeFile("./generate/sandboxScript.js", `export let sandboxScript = ${JSON.stringify(minifyCodeStr)};`);
    }
    catch (error)
    {
        console.error(error);
        process.exit(-1);
    }
    process.exit(0);
})();