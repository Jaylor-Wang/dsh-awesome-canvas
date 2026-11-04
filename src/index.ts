/**
 * DeepSeek Harness (DSH) 原生直连 Awesome Canvas 插件。
 *
 * 绕过外部 stdio 子进程，在 DSH 宿主内部通过轻量 HTTP/WebSocket 原生直连
 * 127.0.0.1:17371 画布常驻网关，实现零延迟、低损耗的画布控制与双向交互。
 *
 * @module dsh-awesome-canvas
 */

import fs from "node:fs";
import path from "node:path";
import { CanvasGatewayClient } from "./client.js";
import { Config, CONFIG_DIR, CONFIG_FILE, readLocalConfigFile, resolveGatewayConfig } from "./config.js";
import { registerCanvasTools } from "./tools.js";
import type { CanvasPluginConfig } from "./types.js";

export const name = "awesome-canvas";
export const inject = ["tools"];
export { Config };

/**
 * Cordis 插件安装与生命周期入口。
 *
 * @param ctx Cordis 容器上下文（必须包含 tools 服务）
 * @param userConfig 用户插件配置
 */
export function apply(
  ctx: {
    tools: { register: (def: any) => () => void };
    logger?: { info?: (msg: string) => void; warn?: (msg: string) => void; error?: (msg: string) => void };
    on?: (event: string, callback: (...args: any[]) => void) => void;
    effect?: (callback: () => void | (() => void)) => void;
  },
  userConfig: CanvasPluginConfig = {}
) {
  const enabled = userConfig.enabled ?? true;
  if (!enabled) {
    return;
  }

  // 1. 解析网关地址与凭据（支持继承 ~/.awesome-canvas/canvas-agent.json 里的 mode 与 timeoutSeconds）
  const localConfig = readLocalConfigFile();
  const gatewayConfig = resolveGatewayConfig(userConfig);
  let effectiveMode = userConfig.mode || localConfig?.mode || "core";
  let effectiveTimeoutMs = userConfig.timeoutMs ?? (localConfig?.timeoutSeconds ? localConfig.timeoutSeconds * 1000 : 60000);
  const client = new CanvasGatewayClient(gatewayConfig, effectiveTimeoutMs);

  // 2. 原生注册画布工具集
  let mergedConfig: CanvasPluginConfig = {
    ...userConfig,
    mode: effectiveMode,
    timeoutMs: effectiveTimeoutMs,
  };
  let currentUnregister = registerCanvasTools(ctx.tools, client, mergedConfig);

  // 3. 配置热监听与动态同步（当前端设置面板修改 canvas-agent.json 时动态热重载工具集与超时时间）
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let watcher: fs.FSWatcher | null = null;

  const handleConfigChange = () => {
    const fresh = readLocalConfigFile();
    if (!fresh) return;

    // 动态同步 Token
    if (gatewayConfig.source !== "explicit" && fresh.token && fresh.token !== client.getConfig().token) {
      client.updateConfig({ token: fresh.token });
    }

    // 动态同步超时时间（若用户未在 DSH 配置中显式锁定 timeoutMs）
    if (!userConfig.timeoutMs && fresh.timeoutSeconds) {
      const newTimeoutMs = fresh.timeoutSeconds * 1000;
      if (newTimeoutMs !== effectiveTimeoutMs) {
        effectiveTimeoutMs = newTimeoutMs;
        client.updateConfig({}, effectiveTimeoutMs);
        const msg = `[dsh-awesome-canvas] 动态热同步：画布工具调用超时调整为 ${fresh.timeoutSeconds}s`;
        ctx.logger?.info ? ctx.logger.info(msg) : console.log(msg);
      }
    }

    // 动态热切换工具集模式（若用户未在 DSH 配置中显式锁定 mode）
    if (!userConfig.mode && fresh.mode && fresh.mode !== effectiveMode) {
      const prevMode = effectiveMode;
      effectiveMode = fresh.mode;

      try {
        currentUnregister();
      } catch {
        // 忽略旧工具注销异常
      }

      mergedConfig = {
        ...userConfig,
        mode: effectiveMode,
        timeoutMs: effectiveTimeoutMs,
      };
      currentUnregister = registerCanvasTools(ctx.tools, client, mergedConfig);

      const msg = `[dsh-awesome-canvas] 动态热重载：工具模式已切换 [${prevMode} -> ${effectiveMode}] (就绪工具数: ${effectiveMode === "core" ? 10 : 30})`;
      ctx.logger?.info ? ctx.logger.info(msg) : console.log(msg);
    }
  };

  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    watcher = fs.watch(CONFIG_DIR, (_event, filename) => {
      if (!filename || filename === path.basename(CONFIG_FILE)) {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(handleConfigChange, 200);
      }
    });
  } catch {
    // 某些宿主虚拟文件系统若不支持 watcher 则保持平退
  }

  const dispose = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (watcher) {
      try {
        watcher.close();
      } catch {
        // 忽略关闭 watcher 异常
      }
      watcher = null;
    }
    currentUnregister();
  };

  // 4. 注册生命周期清理闭包
  if (typeof ctx.effect === "function") {
    ctx.effect(() => {
      return () => {
        dispose();
      };
    });
  }

  // 5. 非阻塞后台状态探活
  void client.probeHealth().then((health) => {
    const logger = ctx.logger;
    if (health.ok) {
      const msg = `[dsh-awesome-canvas] 成功直连 Awesome Canvas 网关 (${gatewayConfig.url}) [模式: ${effectiveMode}, 工具已就绪]`;
      if (logger?.info) {
        logger.info(msg);
      } else {
        console.log(msg);
      }
    } else {
      const hint = `[dsh-awesome-canvas] 画布网关未在线 (${gatewayConfig.url})。启动前端开发服务 (npm run dev) 会随前端自动拉起网关。`;
      if (logger?.warn) {
        logger.warn(hint);
      }
    }
  });

  return {
    client,
    gatewayConfig,
    dispose,
  };
}

export default {
  name,
  inject,
  Config,
  apply,
};

export * from "./client.js";
export * from "./config.js";
export * from "./schemas.js";
export * from "./tools.js";
export * from "./types.js";
