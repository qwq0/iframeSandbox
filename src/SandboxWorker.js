import { extractFunction, injectFunction } from "./functionMapping.js";
import { EventHandler } from "./util/EventHandler.js";

/**
 * 沙箱worker上下文
 * 需要从SandboxContext中分配
 */
export class SandboxWorker
{
    /**
     * 与沙箱worker的通信端口
     * @type {MessagePort}
     */
    #port = null;

    /**
     * 中止控制器
     * 用于销毁沙箱worker时中止
     * @type {AbortController}
     */
    #abortController = new AbortController();

    /**
     * 沙箱worker可用
     * @type {boolean}
     */
    #available = false;

    /**
     * 沙箱worker已销毁
     * @type {boolean}
     */
    #destroyed = false;

    /**
     * 沙箱worker可用事件
     * @type {EventHandler}
     */
    #availableEvent = new EventHandler();

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

    /**
     * 这个沙箱worker所属的沙箱上下文
     * @type {import("./SandboxContext").SandboxContext}
     */
    #sandboxContext = null;

    /**
     * 这个沙箱worker的id
     * @type {string}
     */
    #sandboxWorkerId = "";

    /**
     * 传递给沙箱的接口
     * @type {Object}
     */
    apiObj = {};

    /**
     * 请勿调用此构造器创建SandboxWorker
     * 使用SandboxContext.createWorker()进行创建
     * @param {import("./SandboxContext").SandboxContext} sandboxContext
     * @param {MessagePort} port
     * @param {string} sandboxWorkerId
     */
    constructor(sandboxContext, port, sandboxWorkerId)
    {
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
        }, { signal: this.#abortController.signal });
        port.start();

        this.#sandboxContext = sandboxContext;
        this.#sandboxWorkerId = sandboxWorkerId;
        this.#port = port;
    }

    /**
     * 等待沙箱worker可用
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
        let loopDetectionFunctionName = "loopDet_" + (Math.floor(Math.random() * 100000000)).toString(36);
        let result = extractFunction(this.apiObj, this.#callbackMap);
        this.#port.postMessage({
            type: "execJs",
            js: `"use strict";` + jsCodeStr,
            param: result.result,
            fnMap: (result.fnMap.size > 0 ? result.fnMap : undefined),
            paramName: ["api", loopDetectionFunctionName]
        });
    }

    /**
     * 沙箱worker的id
     */
    get sandboxWorkerId()
    {
        return this.#sandboxWorkerId;
    }

    /**
     * 销毁沙箱worker
     * 销毁后无法对此沙箱worker执行操作
     */
    destroy()
    {
        if (this.#destroyed)
            return;
        this.#destroyed = true;

        this.#abortController.abort();
        this.#abortController = null;

        this.#port.close();
        this.#port = null;

        this.#callbackMap.clear();
        this.#callbackMap = null;
        this.#callbackRejectMap.clear();
        this.#callbackRejectMap = null;

        this.#availableEvent.removeAll();
        this.#availableEvent = null;
        
        this.#available = false;

        if(this.#sandboxContext.available)
        {
            this.#sandboxContext.removeWorker(this);
        }

        this.#sandboxContext = null;
    }
}