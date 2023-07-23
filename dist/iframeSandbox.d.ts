/**
 * 沙箱worker上下文
 */
declare class SandboxWorker {
    /**
     * @param {import("./SandboxContext").SandboxContext} sandboxContext
     * @param {MessagePort} port
     * @param {string} sandboxWorkerId
     */
    constructor(sandboxContext: SandboxContext, port: MessagePort, sandboxWorkerId: string);
    /**
     * 传递给沙箱的接口
     * @type {Object}
     */
    apiObj: any;
    /**
     * 等待沙箱worker可用
     * @returns {Promise<void>}
     */
    waitAvailable(): Promise<void>;
    /**
     * 执行js代码
     * @param {string} jsCodeStr
     * @returns {Promise<void>}
     */
    execJs(jsCodeStr: string): Promise<void>;
    /**
     * 沙箱worker的id
     */
    get sandboxWorkerId(): string;
    /**
     * 销毁沙箱worker
     * 销毁后无法对此沙箱worker执行操作
     */
    destroy(): void;
    #private;
}

/**
 * 沙箱上下文
 */
declare class SandboxContext {
    /**
     * @param {HTMLElement} [iframeElementParent]
     */
    constructor(iframeElementParent?: HTMLElement | undefined);
    /**
     * 传递给沙箱的接口
     * @type {Object}
     */
    apiObj: any;
    /**
     * 等待沙箱可用
     * @returns {Promise<void>}
     */
    waitAvailable(): Promise<void>;
    /**
     * 执行js代码
     * @param {string} jsCodeStr
     * @returns {Promise<void>}
     */
    execJs(jsCodeStr: string): Promise<void>;
    /**
     * 创建SandboxWorker对象
     */
    createWorker(): SandboxWorker;
    /**
     * 移除SandboxWorker对象(销毁)
     * @param {SandboxWorker} worker
    */
    removeWorker(worker: SandboxWorker): void;
    /**
     * 获取iframe元素
     * 注意 移动沙箱在dom树中的位置将导致沙箱失效
     */
    get iframe(): HTMLIFrameElement;
    /**
     * 获取是否可用
     */
    get available(): boolean;
    /**
     * 销毁沙箱
     * 销毁后无法对此沙箱执行操作
     */
    destroy(): void;
    #private;
}

export { SandboxContext };
