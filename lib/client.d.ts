import type { GatewayHealthResponse, ResolvedGatewayConfig } from "./types.js";
export declare class CanvasGatewayClient {
    private url;
    private token;
    private timeoutMs;
    constructor(config: ResolvedGatewayConfig, timeoutMs?: number);
    /** 更新客户端连接配置。 */
    updateConfig(config: ResolvedGatewayConfig, timeoutMs?: number): void;
    getGatewayUrl(): string;
    /**
     * 探活网关健康状态。
     */
    probeHealth(signal?: AbortSignal): Promise<GatewayHealthResponse>;
    /**
     * 调用画布网关工具 (/api/tools)。
     */
    callTool<T = unknown>(name: string, input?: unknown, signal?: AbortSignal): Promise<T>;
    /**
     * 获取网关只读内存资源 (/api/resources/:key)。
     */
    getResource<T = unknown>(key: "state" | "selection", signal?: AbortSignal): Promise<T>;
    /**
     * 底层 HTTP 请求，支持自动超时与外部 signal 协同中断。
     */
    private rawFetch;
    /**
     * 将 Fetch 抛出的底层网络异常包装成对模型及用户友好的提示。
     */
    private normalizeNetworkError;
}
//# sourceMappingURL=client.d.ts.map