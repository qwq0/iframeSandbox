import { parse, tokenizer } from "../lib/acorn.mjs";
import { fullAncestor } from "../lib/walk.mjs";
import { generate } from "../lib/astring.mjs";

let loopTypeNameSet = new Set([
    "ForStatement",
    "WhileStatement",
    "DoWhileStatement",
    "ForInStatement",
    "ForOfStatement",
]);

let functionTypeNameSet = new Set([
    "FunctionExpression",
    "ArrowFunctionExpression",
    "FunctionDeclaration",
]);

/**
 * 创建检测代码
 * @param {string} functionName
 * @param {number} [lineNumber]
 * @returns {Object}
 */
function createDetectionTreeObj(functionName, lineNumber)
{
    return ({
        type: "BlockStatement",
        body: [
            {
                type: "ExpressionStatement",
                expression: {
                    "type": "CallExpression",
                    "callee": {
                        "type": "Identifier",
                        "name": functionName
                    },
                    "arguments":
                        (lineNumber != undefined ? [
                            {
                                "type": "Literal",
                                "value": lineNumber,
                                "raw": String(lineNumber)
                            },
                        ] : []),
                    "optional": false
                }
            }
        ]
    });
}

/**
 * 插入循环检测代码
 * 防止死循环
 * @param {string} jsCodeStr
 * @param {string} functionName
 * @param {boolean} insertLineNumber
 * @param {Set<string>} prohibitedIdentifier
 */
export function insertLoopDetection(jsCodeStr, functionName, insertLineNumber, prohibitedIdentifier)
{
    let lineStartIndexArray = createLineStartIndexArray(jsCodeStr);

    let codeTree = parse(jsCodeStr, {
        ecmaVersion: "latest"
    });

    // console.log(codeTree);

    fullAncestor(codeTree, (now, state, ancestor) =>
    {
        if (loopTypeNameSet.has(now.type)) // 循环
        {
            if (now["body"]?.type == "BlockStatement")
            {
                now["body"].body.unshift(
                    createDetectionTreeObj(
                        functionName, (insertLineNumber ? findUpperBound(lineStartIndexArray, now.start) : undefined)
                    )
                );
            }
            else
            {
                let oldBody = now["body"];
                now["body"] = {
                    type: "BlockStatement",
                    body: [
                        createDetectionTreeObj(
                            functionName, (insertLineNumber ? findUpperBound(lineStartIndexArray, now.start) : undefined)
                        ),
                        oldBody
                    ]
                };
            }
        }
        else if (functionTypeNameSet.has(now.type)) // 函数
        {
            if (now["body"]?.type == "BlockStatement")
            {
                now["body"].body.unshift(
                    createDetectionTreeObj(
                        functionName, (insertLineNumber ? findUpperBound(lineStartIndexArray, now.start) : undefined)
                    )
                );
            }
            else
            {
                let returnValue = now["body"];
                now["body"] = {
                    type: "BlockStatement",
                    body: [
                        createDetectionTreeObj(
                            functionName, (insertLineNumber ? findUpperBound(lineStartIndexArray, now.start) : undefined)
                        ),
                        {
                            type: "ReturnStatement",
                            argument: returnValue
                        }
                    ]
                };
            }
        }
        else if (now.type == "Identifier") // 标识符
        {
            let idName = now["name"];
            if (prohibitedIdentifier.has(idName))
            {
                throw "(sandbox) A prohibited identifier was found during preprocessing.";
            }
        }
        // console.log(ancestor.length, now);
    });

    let ret = generate(codeTree, {});
    // console.log("gen", ret);
    return ret;
}

/**
 * 从有序(不降)数组中寻找第一个大于key的值的索引
 * @param {Array<number>} arr
 * @param {number} key
 * @returns {number}
 */
function findUpperBound(arr, key)
{
    if (arr.length == 0)
        return 0;
    let l = 0, r = arr.length - 1;
    while (l < r)
    {
        let mid = ((l + r) >> 1);
        if (arr[mid] <= key)
        {
            l = mid + 1;
        }
        else
        {
            r = mid;
        }
    }
    if (arr[l] > key)
        return l;
    else
        return l + 1;
}

/**
 * 创建字符串的行起始下标数组
 * @param {string} str
 */
function createLineStartIndexArray(str)
{
    let ret = [0];
    for (let i = 0; i < str.length; i++)
    {
        if (str[i] == "\n")
            ret.push(i + 1);
    }
    return ret;
}