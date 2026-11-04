import type { CanvasGatewayClient } from "./client.js";
import { TOOL_CATALOG } from "./schemas.js";
import type { CanvasPluginConfig, DshToolDefinition, DshToolExecutionContext } from "./types.js";

/**
 * 格式化工具输出，平衡模型可读性与 Token 经济性。
 * 对小数据保留缩进便于排查；对大体积对象（>600 字符）自动采用致密单行 JSON 消除无意义空行与空格，节约 40%~60% 上下文 Token。
 */
export function formatToolOutput(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    const compact = JSON.stringify(value);
    if (compact.length > 600) {
      return compact;
    }
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/**
 * 创建用于向 DSH ToolRuntime 注册的工具定义集。
 */
export function createToolDefinitions(client: CanvasGatewayClient, config: CanvasPluginConfig = {}): DshToolDefinition[] {
  const mode = config.mode || "core";
  const prefix = config.prefix !== undefined ? config.prefix : "canvas_";

  const definitions: DshToolDefinition[] = [];

  for (const [rawName, meta] of Object.entries(TOOL_CATALOG)) {
    // 若为 core 模式且该工具非核心工具，则跳过
    if (mode === "core" && !meta.isCore) {
      continue;
    }

    // 计算注册到 DSH 的工具名称
    let registeredName = rawName;
    if (prefix !== "canvas_") {
      registeredName = rawName.startsWith("canvas_")
        ? `${prefix}${rawName.slice("canvas_".length)}`
        : `${prefix}${rawName}`;
    }

    definitions.push({
      name: registeredName,
      description: meta.description,
      parameters: meta.parameters,
      output: {
        schema: {
          type: "object",
          additionalProperties: true,
        },
        render: (_args: unknown, value: unknown) => {
          return [{ type: "text", text: formatToolOutput(value) }];
        },
      },
      execute: async (args: unknown, exec: DshToolExecutionContext) => {
        return await client.callTool(rawName, args, exec.signal);
      },
    });
  }

  return definitions;
}

/**
 * 注册画布工具到 DSH 上下文，并返回销毁句柄映射。
 */
export function registerCanvasTools(
  toolsService: { register: (def: DshToolDefinition) => () => void },
  client: CanvasGatewayClient,
  config: CanvasPluginConfig = {}
): () => void {
  const definitions = createToolDefinitions(client, config);
  const unregisterCallbacks: Array<() => void> = [];

  for (const def of definitions) {
    try {
      const dispose = toolsService.register(def);
      if (typeof dispose === "function") {
        unregisterCallbacks.push(dispose);
      }
    } catch (err) {
      // 容错处理：记录失败并继续注册其它工具
      console.error(`[dsh-awesome-canvas] 注册工具 ${def.name} 失败:`, err);
    }
  }

  return () => {
    while (unregisterCallbacks.length > 0) {
      const dispose = unregisterCallbacks.pop();
      try {
        dispose?.();
      } catch {
        // 忽略注销时的异常
      }
    }
  };
}
