import { SandboxContext } from "../src/index.js";


(async () =>
{
    let sandbox = new SandboxContext();
    let apiObj = {
        test_0: (a, b, c) =>
        {
            return (a + b) + c;
        },
        test_1: (callback) =>
        {
            callback(123, "test");
        },
        test_2: (callback) =>
        {
            callback((a) =>
            {
                console.log("run test_2", a);
            });
        },
        test_3: async (callback) =>
        {
            console.log("run test_3", await callback());
        }
    };
    sandbox.apiObj = apiObj;
    await sandbox.execJs(`
        (async () =>
        {
            console[String("log")]();
            for(let i=0;i < 100000000;i++)
                ;
        })();
    `);
    console.log(sandbox);
})();