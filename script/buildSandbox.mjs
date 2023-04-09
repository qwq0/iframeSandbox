import fs from "fs/promises";
import * as rollup from "rollup";
import * as terser from "terser";


(async () =>
{
    try
    {
        let bundle = await rollup.rollup({
            input: "./src/sandbox.js"
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