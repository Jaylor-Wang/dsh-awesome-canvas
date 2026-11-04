import type { GatewayHealthResponse, ResolvedGatewayConfig } from "./types.js";
export declare class CanvasGatewayClient {
    private url;
    private token;
    private timeoutMs;
    private source;
    constructor(config: ResolvedGatewayConfig, timeoutMs?: number);
    /** 更新客户端连接配置。 */
    updateConfig(config: Partial<ResolvedGatewayConfig>, timeoutMs?: number): void;
    getConfig(): ResolvedGatewayConfig;
    getGatewayUrl(): string;
    /**
     * 探活网关健康状态。
     */
    probeHealth(signal?: AbortSignal): Promise<GatewayHealthResponse>;
    /**
     * 调用画布网关工具 (/api/tools)。
     * 支持 Token 失效时的本地配置文件自愈重试机制。
     */
    callTool<T = unknown>(name: string, input?: unknown, signal?: AbortSignal): Promise<T>;
    /**
     * 获取网关只读内存资源 (/api/resources/:key)。
     */
    getResource<T = unknown>(key: "state" | "selection", signal?: AbortSignal): Promise<T>;
    /**
     * 底层 HTTP 请求，支持自动超时、外部 signal 协同中断以及网络冷启动瞬态退避重试。
     */
    private rawFetch;
    /**
     * 判断是否属于网络连接瞬态未就绪或抖动错误（TCP 未握手，重试绝对安全）。
     */
    private isTransientNetworkError;
    /**
     * 将 Fetch 抛出的底层网络异常包装成对模型及用户友好的提示。
     */
    private normalizeNetworkError;
}
//# sourceMappingURL=client.d.ts.map