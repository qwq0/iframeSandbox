import { extractFunction, injectFunction } from "../functionMapping.js";

/*
    这个文件在iframe里的worker中执行
*/
(() =>
{
    "use strict";

    /**
     * @type {MessagePort}
     */
    let port = null;
    /**
     * @type {Map<string, Function>}
     */
    let callbackMap = new Map();
    /**
     * @type {Map<string, Function>}
     */
    let callbackRejectMap = new Map();

    self.addEventListener("message", e =>
    {
        if (port != null || e.data?.type != "setMessagePort") // 初始化通信管道
            return;
        port = e.data.port;
        // console.log("bind worker port");

        Object.defineProperty(self, "iframeSandboxWorker", {
            configurable: false,
            writable: false,
            value: {}
        });

        port.addEventListener("message", async (e) =>
        {
            let data = e.data;
            // console.log(e);
            switch (data.type)
            {
                case "execJs": {
                    (new Function(...data.paramName, data.js))
                        (
                            (data.fnMap ? injectFunction(data.param, data.fnMap, port, callbackMap, callbackRejectMap).result : data.param)
                        );
                    break;
                }
                case "fn": {
                    if (callbackMap.has(data.id))
                    {
                        let param = (data.fnMap ? injectFunction(data.param, data.fnMap, port, callbackMap, callbackRejectMap).result : data.param);
                        try
                        {
                            let retValue = await callbackMap.get(data.id)(...param);
                            if (data.cb)
                            {
                                let result = extractFunction(retValue, callbackMap);
                                port.postMessage({
                                    type: "sol",
                                    id: data.cb,
                                    param: [result.result],
                                    fnMap: (result.fnMap.size > 0 ? result.fnMap : undefined)
                                });
                            }
                        }
                        catch (err)
                        {
                            if (data.cb)
                                port.postMessage({
                                    type: "rej",
                                    id: data.cb,
                                    param: [err]
                                });
                        }
                    }
                    break;
                }
                case "rF": {
                    callbackMap.delete(data.id);
                    break;
                }
                case "sol": {
                    let param = (data.fnMap ? injectFunction(data.param, data.fnMap, port, callbackMap, callbackRejectMap).result : data.param);
                    if (callbackMap.has(data.id))
                        callbackMap.get(data.id)(...param);
                    callbackMap.delete(data.id);
                    callbackRejectMap.delete(data.id);
                    break;
                }
                case "rej": {
                    if (callbackRejectMap.has(data.id))
                        callbackRejectMap.get(data.id)(...data.param);
                    callbackMap.delete(data.id);
                    callbackRejectMap.delete(data.id);
                    break;
                }
            }
        });
        port.start();
        port.postMessage({ type: "ready" });
    });

    // console.log("sandbox worker onload");
    self.postMessage({ type: "ready" });
})();