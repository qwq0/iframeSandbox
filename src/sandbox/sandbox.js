import "./isolation.js";

import { extractFunction, injectFunction } from "../functionMapping.js";
import { Function, setInterval } from "./isolation.js";
import { loopDetectionFunction, resetLoopDetection } from "./loopDetection.js";
import { sandboxWorkerScript } from "../../generate/sandboxWorkerScript.js";

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
    
    /**
     * @type {Map<string, Worker>}
     */
    let workerMap = new Map();

    window.addEventListener("message", e =>
    {
        if (port != null || e.data?.type != "setMessagePort") // 初始化通信管道
            return;
        port = e.data.port;

        Object.defineProperty(window, "iframeSandbox", {
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
                            (data.fnMap ? injectFunction(data.param, data.fnMap, port, callbackMap, callbackRejectMap).result : data.param),
                            loopDetectionFunction
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
                case "createWorker": {
                    let workerUrl = URL.createObjectURL(new Blob([sandboxWorkerScript], { type: "text/javascript" }));
                    let worker = new Worker(workerUrl);
                    workerMap.set(data.id, worker);
                    let boundPort = false;
                    worker.addEventListener("message", e =>
                    {
                        if (boundPort || e.data?.type != "ready")
                            return;
                        worker.postMessage({
                            type: "setMessagePort",
                            port: data.port
                        }, [data.port]);
                    });
                    break;
                }
                case "removeWorker": {
                    let worker = workerMap.get(data.id);
                    worker.terminate();
                    workerMap.delete(data.id);
                    break;
                }
            }
        });
        port.start();
        port.postMessage({ type: "ready" });
    });

    setInterval(() =>
    {
        resetLoopDetection();
    }, 500);

    window.addEventListener("load", e =>
    {
        console.log("sandbox onload");
    });

})();