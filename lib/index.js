/**
 * DeepSeek Harness (DSH) 原生直连 Awesome Canvas 插件。
 *
 * 绕过外部 stdio 子进程，在 DSH 宿主内部通过轻量 HTTP/WebSocket 原生直连
 * 127.0.0.1:17371 画布常驻网关，实现零延迟、低损耗的画布控制与双向交互。
 *
 * @module dsh-awesome-canvas
 */
import { CanvasGatewayClient } from "./client.js";
import { Config, resolveGatewayConfig } from "./config.js";
import { registerCanvasTools } from "./tools.js";
export const name = "awesome-canvas";
export const inject = ["tools"];
export { Config };
/**
 * Cordis 插件安装与生命周期入口。
 *
 * @param ctx Cordis 容器上下文（必须包含 tools 服务）
 * @param userConfig 用户插件配置
 */
export function apply(ctx, userConfig = {}) {
    const enabled = userConfig.enabled ?? true;
    if (!enabled) {
        return;
    }
    // 1. 解析网关地址与凭据
    const gatewayConfig = resolveGatewayConfig(userConfig);
    const client = new CanvasGatewayClient(gatewayConfig, userConfig.timeoutMs ?? 60000);
    // 2. 原生注册画布工具集
    const unregister = registerCanvasTools(ctx.tools, client, userConfig);
    // 3. 注册生命周期清理闭包
    if (typeof ctx.effect === "function") {
        ctx.effect(() => {
            return () => {
                unregister();
            };
        });
    }
    // 4. 非阻塞后台状态探活
    void client.probeHealth().then((health) => {
        const logger = ctx.logger;
        if (health.ok) {
            const mode = userConfig.mode || "core";
            const msg = `[dsh-awesome-canvas] 成功直连 Awesome Canvas 网关 (${gatewayConfig.url}) [模式: ${mode}, 工具已就绪]`;
            if (logger?.info) {
                logger.info(msg);
            }
            else {
                console.log(msg);
            }
        }
        else {
            const hint = `[dsh-awesome-canvas] 画布网关未在线 (${gatewayConfig.url})。启动前端开发服务 (npm run dev) 会随前端自动拉起网关。`;
            if (logger?.warn) {
                logger.warn(hint);
            }
        }
    });
    return {
        client,
        gatewayConfig,
        dispose: unregister,
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
//# sourceMappingURL=index.js.map