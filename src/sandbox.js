import { extractFunction, injectFunction } from "./functionMapping.js";
import { uniqueIdentifierString } from "./util/uniqueIdentifier.js";

/*
    这个文件在iframe中执行
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

    window.addEventListener("message", e =>
    {
        if (e.data == "setMessagePort" && port == null) // 初始化通信管道
        {
            port = e.ports[0];
            Object.defineProperty(window, "iframeSandbox", {
                configurable: false,
                writable: false,
                value: {}
            });
            port.addEventListener("message", async (e) =>
            {
                let data = e.data;
                switch (data.type)
                {
                    case "execJs": {
                        (new Function(...data.paramList, data.js))
                            (data.fnMap ? injectFunction(data.param, data.fnMap, port, callbackMap, callbackRejectMap).result : data.param);
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
        }
    });

    window.addEventListener("load", e =>
    {
        console.log("sandbox onload");
    });

})();