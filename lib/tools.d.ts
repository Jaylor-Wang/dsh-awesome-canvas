import type { CanvasGatewayClient } from "./client.js";
import type { CanvasPluginConfig, DshToolDefinition } from "./types.js";
/**
 * 创建用于向 DSH ToolRuntime 注册的工具定义集。
 */
export declare function createToolDefinitions(client: CanvasGatewayClient, config?: CanvasPluginConfig): DshToolDefinition[];
/**
 * 注册画布工具到 DSH 上下文，并返回销毁句柄映射。
 */
export declare function registerCanvasTools(toolsService: {
    register: (def: DshToolDefinition) => () => void;
}, client: CanvasGatewayClient, config?: CanvasPluginConfig): () => void;
//# sourceMappingURL=tools.d.ts.map