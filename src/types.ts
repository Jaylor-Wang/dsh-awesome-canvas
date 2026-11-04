/**
 * TypeScript types and schemas for dsh-awesome-canvas.
 */

export type PluginMode = "core" | "all";

export interface CanvasPluginConfig {
  /** 是否启用 Awesome Canvas 插件。默认为 true。 */
  enabled?: boolean;
  /**
   * 工具暴露模式：
   * - "core": 精简核心模式（推荐），只向智能体暴露 10 个高频原子工具，防止上下文膨胀。
   * - "all": 全量模式，暴露全部 30 个画布原子控制工具。
   * 默认为 "core"。
   */
  mode?: PluginMode;
  /** 画布网关服务 HTTP 地址。默认自动读取本地配置或使用 http://127.0.0.1:17371。 */
  url?: string;
  /** 画布网关访问鉴权令牌。默认自动读取 ~/.infinite-canvas/canvas-agent.json。 */
  token?: string;
  /**
   * 注册到 DSH 的工具名称前缀。
   * 默认为 "canvas_"（符合标准 MCP 工具名）。
   * 也可指定为 "awesome_canvas_"。
   */
  prefix?: string;
  /** 单次工具调用 HTTP 超时时间（毫秒）。默认为 30000ms（30 秒）。 */
  timeoutMs?: number;
}

export interface GatewayHealthResponse {
  ok?: boolean;
  status?: string;
  protocolVersion?: string;
  connectedClients?: number;
  activeProjectId?: string;
  lastActiveTime?: number;
  [key: string]: unknown;
}

export interface GatewayToolResponse<T = unknown> {
  ok: boolean;
  result?: T;
  error?: string;
}

export interface ResolvedGatewayConfig {
  url: string;
  token: string;
  source: "explicit" | "local_file" | "default";
}

/** DSH Tool Definition 接口约定 */
export interface DshToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  output?: {
    schema?: Record<string, unknown>;
    render?: (args: unknown, value: unknown) => Array<{ type: "text"; text: string }>;
  };
  execute: (args: unknown, exec: DshToolExecutionContext) => Promise<unknown>;
}

export interface DshToolExecutionContext {
  agent?: unknown;
  signal?: AbortSignal;
  callId?: string;
  [key: string]: unknown;
}

export interface ToolMetadata {
  name: string;
  description: string;
  isCore: boolean;
  parameters: Record<string, unknown>;
}
