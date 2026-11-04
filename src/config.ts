import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { CanvasPluginConfig, ResolvedGatewayConfig } from "./types.js";

export const DEFAULT_PORT = 17371;
export const DEFAULT_GATEWAY_URL = `http://127.0.0.1:${DEFAULT_PORT}`;
export const CONFIG_DIR = path.join(os.homedir(), ".awesome-canvas");
export const CONFIG_FILE = path.join(CONFIG_DIR, "canvas-agent.json");

/**
 * 从本地磁盘读取 ~/.awesome-canvas/canvas-agent.json 配置。
 */
export function readLocalConfigFile(): { url?: string; token?: string } | null {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return null;
    }
    const content = fs.readFileSync(CONFIG_FILE, "utf8");
    const parsed = JSON.parse(content) as { url?: string; token?: string };
    return {
      url: typeof parsed.url === "string" ? parsed.url : undefined,
      token: typeof parsed.token === "string" ? parsed.token : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * 解析并确定最终网关地址与 Token。
 * 优先级：显式传入配置 > 本地 canvas-agent.json 配置文件 > 默认配置。
 */
export function resolveGatewayConfig(config: CanvasPluginConfig = {}): ResolvedGatewayConfig {
  const local = readLocalConfigFile();

  if (config.url && config.token) {
    return {
      url: config.url.replace(/\/+$/, ""),
      token: config.token,
      source: "explicit",
    };
  }

  const resolvedUrl = (config.url || local?.url || DEFAULT_GATEWAY_URL).replace(/\/+$/, "");
  const resolvedToken = config.token || local?.token || "";

  return {
    url: resolvedUrl,
    token: resolvedToken,
    source: local ? "local_file" : "default",
  };
}

let ConfigSchema: unknown = null;

try {
  // @ts-ignore
  const schemastery = (await import("@deepseek-ai/schemastery")) as any;
  const z = schemastery.default || schemastery;
  ConfigSchema = z.object({
    enabled: z.boolean().default(true).description("是否启用 Awesome Canvas 直连插件"),
    mode: z.union([z.const("core"), z.const("all")]).default("core").description("工具集模式：'core' 为精简推荐（10个），'all' 为全量（30个）"),
    url: z.string().default("").description("画布网关 HTTP 地址，留空则自动探测本地网关"),
    token: z.string().default("").description("画布网关 Token，留空则自动读取本地凭据"),
    prefix: z.string().default("canvas_").description("注册到 DSH 的工具名称前缀，如 'canvas_' 或 'awesome_canvas_'"),
    timeoutMs: z.number().step(1).min(1000).default(30000).description("单次请求网关超时时间（毫秒）"),
  });
} catch {
  // 如果缺少 @deepseek-ai/schemastery 则保持平退默认
  ConfigSchema = {
    enabled: true,
    mode: "core",
    url: "",
    token: "",
    prefix: "canvas_",
    timeoutMs: 30000,
  };
}

export { ConfigSchema as Config };
