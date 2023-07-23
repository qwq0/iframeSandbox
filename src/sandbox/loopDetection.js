
/**
 * 运行次数
 */
let runCount = 0;

/**
 * 运行起始时间(上次重置)
 */
let startTime = Date.now();

/**
 * 循环检测函数
 * @param {number} [lineNumber]
 */
export function loopDetectionFunction(lineNumber)
{
    runCount++;
    if (runCount > 2000000)
    {
        if (Date.now() > startTime + 2 * 1000)
        {
            throw `(sandbox) The program occupies the main thread for too long. Have been forcibly terminated. ${lineNumber != undefined ? `(line ${lineNumber})` : ""}`;
        }
    }
}

/**
 * 重置循环检测
 */
export function resetLoopDetection()
{
    runCount = 0;
    startTime = Date.now();
}