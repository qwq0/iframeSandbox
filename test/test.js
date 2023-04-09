import { SandboxContext } from "../src/main.js";


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
            console.log("console.log in sandbox");
            console.log("run test_0", await api.test_0(1, 2, "3"));
            await api.test_1((a, b) => {
                console.log("run test_1", a, b);
            });
            await api.test_2((callback) => {
               callback(456);
            });
            await api.test_3(() => 789);

            console.time();
            for(let i=0;i<1000;i++)
                await api.test_2((callback) => {
                    callback(10);
                });
            console.timeEnd();
        })();
    `);
    console.log(sandbox);
})();