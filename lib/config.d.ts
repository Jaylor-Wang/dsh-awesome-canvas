import type { CanvasPluginConfig, ResolvedGatewayConfig } from "./types.js";
export declare const DEFAULT_PORT = 17371;
export declare const DEFAULT_GATEWAY_URL = "http://127.0.0.1:17371";
export declare const CONFIG_DIR: string;
export declare const CONFIG_FILE: string;
export declare const LEGACY_CONFIG_DIR: string;
export declare const LEGACY_CONFIG_FILE: string;
/**
 * 从本地磁盘读取 ~/.awesome-canvas/canvas-agent.json 配置（兼容回退 ~/.infinite-canvas）。
 */
export declare function readLocalConfigFile(): {
    url?: string;
    token?: string;
} | null;
/**
 * 解析并确定最终网关地址与 Token。
 * 优先级：显式传入配置 > 本地 canvas-agent.json 配置文件 > 默认配置。
 */
export declare function resolveGatewayConfig(config?: CanvasPluginConfig): ResolvedGatewayConfig;
declare let ConfigSchema: unknown;
export { ConfigSchema as Config };
//# sourceMappingURL=config.d.ts.map