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
        },
        console_log: async (a) =>
        {
            console.log(a);
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
            for(let i=0;i<100;i++)
            await api.test_2((callback) => {
                callback(10);
            });
            console.timeEnd();

            for(let i=0;i<1000;i++)
            {
                console.log("test");
            }

            let i=0;
            while(i<1000)
            {
                console.log("test");
                i++;
            }

            i=0;
            do
            {
                console.log("test");
                i++;
            }
            while(i<1000);

            for(let a in [])
            {
            }

            for(let a of [])
            {
            }

            await api.console_log(() => { console.log("test"); });
        })();
    `);
    console.log(sandbox);
})();