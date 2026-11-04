import type { CanvasGatewayClient } from "./client.js";
import type { CanvasPluginConfig, DshToolDefinition } from "./types.js";
/**
 * 格式化工具输出，平衡模型可读性与 Token 经济性。
 * 对小数据保留缩进便于排查；对大体积对象（>600 字符）自动采用致密单行 JSON 消除无意义空行与空格，节约 40%~60% 上下文 Token。
 */
export declare function formatToolOutput(value: unknown): string;
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