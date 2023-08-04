import { uniqueIdentifierString } from "./util/uniqueIdentifier.js";

/**
 * 提取对象中的函数
 * @param {Object} obj
 * @param {Map<string, Function>} callbackMap
 */
export function extractFunction(obj, callbackMap)
{
    let functionMap = new Map();

    /**
     * 遍历对象过滤函数
     * @param {any} now 
     * @returns {any}
     */
    function traversal(now)
    {
        if (typeof (now) == "function")
        {
            let ret = {};
            let functionId = uniqueIdentifierString();
            callbackMap.set(functionId, now);
            functionMap.set(ret, functionId);
            return ret;
        }
        else if (typeof (now) == "object")
        {
            if (Array.isArray(now))
            {
                return now.map(traversal);
            }
            else
            {
                let ret = {};
                Object.keys(now).forEach(key =>
                {
                    ret[key] = traversal(now[key]);
                });
                return ret;
            }
        }
        else
            return now;
    }
    let result = traversal(obj);

    return ({
        result: result,
        fnMap: functionMap
    });
}


const functionFinalizationRegistry = new FinalizationRegistry((/** @type {{ id: string, port: MessagePort }} */{ id, port }) =>
{
    port.postMessage({
        type: "rF",
        id: id
    });
});

/**
 * 将函数注入回对象
 * @param {Object} obj 
 * @param {Map<Object, string>} fnMap 
 * @param {MessagePort} port
 * @param {Map<string, Function>} callbackMap
 * @param {Map<string, Function>} callbackRejectMap
 */
export function injectFunction(obj, fnMap, port, callbackMap, callbackRejectMap)
{
    /**
     * @type {Map<string, Function>}
     */
    let generatedFunctionMap = new Map();
    fnMap.forEach((id, functionObj) =>
    {
        if (!generatedFunctionMap.has(id))
        {
            let generatedFunction = (...param) => // TODO 修复沙箱销毁后执行函数的潜在内存泄漏问题
            {
                return new Promise((resolve, reject) =>
                {
                    let result = extractFunction(param, callbackMap);
                    let callbackId = uniqueIdentifierString();
                    callbackMap.set(callbackId, resolve);
                    callbackRejectMap.set(callbackId, reject);
                    port.postMessage({
                        type: "fn",
                        id: id,
                        param: result.result,
                        fnMap: (result.fnMap.size > 0 ? result.fnMap : undefined),
                        cb: callbackId
                    });
                });
            };
            generatedFunctionMap.set(id, generatedFunction);
            functionFinalizationRegistry.register(generatedFunction, {
                id: id,
                port: port
            });
        }
    });

    /**
     * 遍历对象嵌入函数
     * @param {any} now 
     * @returns {any}
     */
    const traversal = (now) =>
    {
        if (typeof (now) == "object")
        {
            if (fnMap.has(now))
            {
                return generatedFunctionMap.get(fnMap.get(now));
            }
            else if (Array.isArray(now))
            {
                return now.map(traversal);
            }
            else
            {
                let ret = {};
                Object.keys(now).forEach(key =>
                {
                    ret[key] = traversal(now[key]);
                });
                return ret;
            }
        }
        else
            return now;
    };
    let result = traversal(obj);

    return ({
        result: result
    });
}