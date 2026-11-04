import { TOOL_CATALOG } from "./schemas.js";
/**
 * 创建用于向 DSH ToolRuntime 注册的工具定义集。
 */
export function createToolDefinitions(client, config = {}) {
    const mode = config.mode || "core";
    const prefix = config.prefix !== undefined ? config.prefix : "canvas_";
    const definitions = [];
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
                render: (_args, value) => {
                    let text;
                    if (typeof value === "string") {
                        text = value;
                    }
                    else {
                        try {
                            text = JSON.stringify(value, null, 2);
                        }
                        catch {
                            text = String(value);
                        }
                    }
                    return [{ type: "text", text }];
                },
            },
            execute: async (args, exec) => {
                return await client.callTool(rawName, args, exec.signal);
            },
        });
    }
    return definitions;
}
/**
 * 注册画布工具到 DSH 上下文，并返回销毁句柄映射。
 */
export function registerCanvasTools(toolsService, client, config = {}) {
    const definitions = createToolDefinitions(client, config);
    const unregisterCallbacks = [];
    for (const def of definitions) {
        try {
            const dispose = toolsService.register(def);
            if (typeof dispose === "function") {
                unregisterCallbacks.push(dispose);
            }
        }
        catch (err) {
            // 容错处理：记录失败并继续注册其它工具
            console.error(`[dsh-awesome-canvas] 注册工具 ${def.name} 失败:`, err);
        }
    }
    return () => {
        while (unregisterCallbacks.length > 0) {
            const dispose = unregisterCallbacks.pop();
            try {
                dispose?.();
            }
            catch {
                // 忽略注销时的异常
            }
        }
    };
}
//# sourceMappingURL=tools.js.map