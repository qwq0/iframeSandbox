let Function = window.Function;
window.Function = null;
Function.prototype.constructor = null;

let evalFunction = window.eval;
window.eval = null;

let setInterval = window.setInterval;
// @ts-ignore
window.setInterval = (func, delay, ...arg) =>
{
    if (typeof (func) == "function")
        setInterval(func, delay, ...arg);
    else
        throw "(sandbox) Dynamic script execution is prohibited.";
};
let setTimeout = window.setTimeout;
// @ts-ignore
window.setTimeout = (func, delay, ...arg) =>
{
    if (typeof (func) == "function")
        setTimeout(func, delay, ...arg);
    else
        throw "(sandbox) Dynamic script execution is prohibited.";
};


export { Function, evalFunction, setInterval, setTimeout };