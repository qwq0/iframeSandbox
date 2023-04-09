import { sandboxScript } from "../generate/sandboxScript.js";
import { extractFunction, injectFunction } from "./functionMapping.js";
import { EventHandler } from "./util/EventHandler.js";

/**
 * 沙箱上下文
 */
export class SandboxContext
{
    /**
     * 沙箱iframe元素
     * @type {HTMLIFrameElement}
     */
    #iframe = null;

    /**
     * 与沙箱的通信端口
     * @type {MessagePort}
     */
    #port = null;

    /**
     * 沙箱可用
     * @type {boolean}
     */
    #available = false;

    /**
     * 沙箱可用事件
     * @type {EventHandler}
     */
    #availableEvent = new EventHandler();

    /**
     * 传递给沙箱的接口
     * @type {Object}
     */
    apiObj = {};

    /**
     * 回调映射
     * @type {Map<string, Function>}
     */
    #callbackMap = new Map();

    /**
     * 拒绝回调映射
     * @type {Map<string, Function>}
     */
    #callbackRejectMap = new Map();

    constructor()
    {
        if (!(("sandbox" in HTMLIFrameElement.prototype) && Object.hasOwn(HTMLIFrameElement.prototype, "contentDocument")))
            throw "sandbox property are not supported";
        let iframe = document.createElement("iframe");
        iframe.sandbox.add("allow-scripts");
        iframe.style.display = "none";
        iframe.srcdoc = ([
            "<!DOCTYPE html>",
            "<html>",

            "<head>",
            '<meta charset="utf-8" />',
            '<title>iframe sandbox</title>',
            '<meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no" />',
            "</head>",

            "<body>",
            "<script>",
            sandboxScript,
            "</script>",
            "</body>",

            "</html>"
        ]).join("");


        let channel = new MessageChannel();
        let port = channel.port1;
        port.addEventListener("message", async (e) =>
        {
            let data = e.data;
            switch (data.type)
            {
                case "ready": {
                    this.#available = true;
                    this.#availableEvent.trigger();
                    break;
                }
                case "fn": {
                    if (this.#callbackMap.has(data.id))
                    {
                        let param = (data.fnMap ? injectFunction(data.param, data.fnMap, port, this.#callbackMap, this.#callbackRejectMap).result : data.param);
                        try
                        {
                            let retValue = await this.#callbackMap.get(data.id)(...param);
                            if (data.cb)
                            {
                                let result = extractFunction(retValue, this.#callbackMap);
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
                    this.#callbackMap.delete(data.id);
                    break;
                }
                case "sol": {
                    let param = (data.fnMap ? injectFunction(data.param, data.fnMap, port, this.#callbackMap, this.#callbackRejectMap).result : data.param);
                    if (this.#callbackMap.has(data.id))
                        this.#callbackMap.get(data.id)(...param);
                    this.#callbackMap.delete(data.id);
                    this.#callbackRejectMap.delete(data.id);
                    break;
                }
                case "rej": {
                    if (this.#callbackRejectMap.has(data.id))
                        this.#callbackRejectMap.get(data.id)(...data.param);
                    this.#callbackMap.delete(data.id);
                    this.#callbackRejectMap.delete(data.id);
                    break;
                }
            }
        });
        iframe.addEventListener("load", () =>
        {
            if (!this.#available)
            {
                if (iframe.contentDocument)
                    throw "sandbox isolation failed";
                port.start();
                iframe.contentWindow.postMessage("setMessagePort", "*", [channel.port2]); // 初始化通信管道
            }
        });


        document.body.appendChild(iframe);
        this.#iframe = iframe;
        this.#port = port;
    }

    /**
     * 等待沙箱可用
     * @returns {Promise<void>}
     */
    async waitAvailable()
    {
        return new Promise((resolve, reject) =>
        {
            if (this.#available)
                resolve();
            else
                this.#availableEvent.addOnce(resolve);
        });
    }

    /**
     * 执行js代码
     * @param {string} jsCodeStr
     * @returns {Promise<void>}
     */
    async execJs(jsCodeStr)
    {
        if (!this.#available)
            await this.waitAvailable();
        let result = extractFunction(this.apiObj, this.#callbackMap);
        this.#port.postMessage({
            type: "execJs",
            js: jsCodeStr,
            param: result.result,
            fnMap: (result.fnMap.size > 0 ? result.fnMap : undefined),
            paramList: ["api"]
        });
    }

    get iframe()
    {
        return this.#iframe;
    }
};



