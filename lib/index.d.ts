/**
 * DeepSeek Harness (DSH) 原生直连 Awesome Canvas 插件。
 *
 * 绕过外部 stdio 子进程，在 DSH 宿主内部通过轻量 HTTP/WebSocket 原生直连
 * 127.0.0.1:17371 画布常驻网关，实现零延迟、低损耗的画布控制与双向交互。
 *
 * @module dsh-awesome-canvas
 */
import { CanvasGatewayClient } from "./client.js";
import { Config } from "./config.js";
import type { CanvasPluginConfig } from "./types.js";
export declare const name = "awesome-canvas";
export declare const inject: string[];
export { Config };
/**
 * Cordis 插件安装与生命周期入口。
 *
 * @param ctx Cordis 容器上下文（必须包含 tools 服务）
 * @param userConfig 用户插件配置
 */
export declare function apply(ctx: {
    tools: {
        register: (def: any) => () => void;
    };
    logger?: {
        info?: (msg: string) => void;
        warn?: (msg: string) => void;
        error?: (msg: string) => void;
    };
    on?: (event: string, callback: (...args: any[]) => void) => void;
    effect?: (callback: () => void | (() => void)) => void;
}, userConfig?: CanvasPluginConfig): {
    client: CanvasGatewayClient;
    gatewayConfig: import("./types.js").ResolvedGatewayConfig;
    dispose: () => void;
} | undefined;
declare const _default: {
    name: string;
    inject: string[];
    Config: unknown;
    apply: typeof apply;
};
export default _default;
export * from "./client.js";
export * from "./config.js";
export * from "./schemas.js";
export * from "./tools.js";
export * from "./types.js";
//# sourceMappingURL=index.d.ts.map