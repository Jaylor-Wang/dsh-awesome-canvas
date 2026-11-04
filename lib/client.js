import { readLocalConfigFile } from "./config.js";
export class CanvasGatewayClient {
    url;
    token;
    timeoutMs;
    source;
    constructor(config, timeoutMs = 60000) {
        this.url = config.url.replace(/\/+$/, "");
        this.token = config.token;
        this.source = config.source;
        this.timeoutMs = timeoutMs;
    }
    /** 更新客户端连接配置。 */
    updateConfig(config, timeoutMs) {
        if (config.url)
            this.url = config.url.replace(/\/+$/, "");
        if (config.token !== undefined)
            this.token = config.token;
        if (config.source)
            this.source = config.source;
        if (timeoutMs)
            this.timeoutMs = timeoutMs;
    }
    getConfig() {
        return {
            url: this.url,
            token: this.token,
            source: this.source,
        };
    }
    getGatewayUrl() {
        return this.url;
    }
    /**
     * 探活网关健康状态。
     */
    async probeHealth(signal) {
        try {
            const res = await this.rawFetch("/health", { method: "GET" }, signal);
            if (!res.ok) {
                return { ok: false, status: `HTTP ${res.status}` };
            }
            return (await res.json());
        }
        catch (err) {
            return { ok: false, status: "unreachable", error: String(err) };
        }
    }
    /**
     * 调用画布网关工具 (/api/tools)。
     * 支持 Token 失效时的本地配置文件自愈重试机制。
     */
    async callTool(name, input = {}, signal) {
        let res;
        try {
            res = await this.rawFetch("/api/tools", {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    "x-canvas-agent-token": this.token,
                },
                body: JSON.stringify({ name, input: input ?? {} }),
            }, signal);
        }
        catch (error) {
            throw this.normalizeNetworkError(error);
        }
        // 401 鉴权失效无感自愈：若 Token 来自本地文件，网关重启时会刷新 Token，重新加载磁盘配置并自动重试 1 次
        if (res.status === 401 && this.source !== "explicit") {
            const fresh = readLocalConfigFile();
            if (fresh?.token && fresh.token !== this.token) {
                this.token = fresh.token;
                try {
                    res = await this.rawFetch("/api/tools", {
                        method: "POST",
                        headers: {
                            "content-type": "application/json",
                            "x-canvas-agent-token": this.token,
                        },
                        body: JSON.stringify({ name, input: input ?? {} }),
                    }, signal);
                }
                catch (error) {
                    throw this.normalizeNetworkError(error);
                }
            }
        }
        if (res.status === 401) {
            throw new Error(`[Awesome Canvas 鉴权失败] 连接令牌不匹配。请确认 ~/.awesome-canvas/canvas-agent.json 或配置项中的 token 是否与当前运行的网关一致。`);
        }
        let body;
        try {
            body = (await res.json());
        }
        catch {
            throw new Error(`[Awesome Canvas 网关响应异常] 网关返回了非 JSON 格式数据 (HTTP ${res.status})。`);
        }
        if (!body.ok) {
            const errMsg = body.error || "未知工具执行错误";
            if (errMsg.includes("[NO_CANVAS]") || errMsg.includes("当前没有已连接画布")) {
                throw new Error(`[Awesome Canvas 页面未连接] 画布网关服务正常在线，但当前浏览器中未打开任何画布工程。\n请在浏览器打开 http://localhost:3000 并进入一个项目工程，保持页面开启后再重试。`);
            }
            throw new Error(`[Awesome Canvas 工具调用失败] ${errMsg}`);
        }
        return body.result;
    }
    /**
     * 获取网关只读内存资源 (/api/resources/:key)。
     */
    async getResource(key, signal) {
        let res;
        try {
            res = await this.rawFetch(`/api/resources/${key}`, {
                method: "GET",
                headers: {
                    "x-canvas-agent-token": this.token,
                },
            }, signal);
        }
        catch (error) {
            throw this.normalizeNetworkError(error);
        }
        // 401 自愈重试
        if (res.status === 401 && this.source !== "explicit") {
            const fresh = readLocalConfigFile();
            if (fresh?.token && fresh.token !== this.token) {
                this.token = fresh.token;
                try {
                    res = await this.rawFetch(`/api/resources/${key}`, {
                        method: "GET",
                        headers: {
                            "x-canvas-agent-token": this.token,
                        },
                    }, signal);
                }
                catch (error) {
                    throw this.normalizeNetworkError(error);
                }
            }
        }
        if (res.status === 401) {
            throw new Error(`[Awesome Canvas 鉴权失败] 读取资源 ${key} 时鉴权失败。`);
        }
        const body = (await res.json());
        if (!body.ok) {
            throw new Error(body.error || `读取资源 ${key} 失败`);
        }
        return body.result;
    }
    /**
     * 底层 HTTP 请求，支持自动超时、外部 signal 协同中断以及网络冷启动瞬态退避重试。
     */
    async rawFetch(pathname, init, externalSignal, retryAllowed = true) {
        const targetUrl = `${this.url}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
        const timeoutController = new AbortController();
        let isTimeout = false;
        const timer = setTimeout(() => {
            isTimeout = true;
            timeoutController.abort(new Error(`TIMEOUT_${this.timeoutMs}`));
        }, this.timeoutMs);
        // 将外部 signal 与超时 controller 级联
        const onAbort = () => {
            timeoutController.abort(externalSignal?.reason || new Error("CALLER_ABORTED"));
        };
        if (externalSignal) {
            if (externalSignal.aborted) {
                clearTimeout(timer);
                throw new Error("Tool execution aborted by caller");
            }
            externalSignal.addEventListener("abort", onAbort, { once: true });
        }
        try {
            return await fetch(targetUrl, {
                ...init,
                signal: timeoutController.signal,
            });
        }
        catch (error) {
            if (isTimeout) {
                throw new Error(`[Awesome Canvas 调用超时] 单次工具调用超过了 ${this.timeoutMs}ms 超时上限。\n如为 AI 生成或大资源下载等耗时任务，可在 DSH 配置中调大 timeoutMs，或在调用 generation_get_status 时通过 wait/timeoutSeconds 分步轮询。`);
            }
            if (externalSignal?.aborted) {
                throw new Error("Tool execution aborted by caller");
            }
            // 瞬态连接拒绝容错（如前端服务刚启动时 TCP 监听间隙），自动瞬态退避重试 1 次（等待 400ms）
            if (retryAllowed && this.isTransientNetworkError(error)) {
                clearTimeout(timer);
                if (externalSignal) {
                    externalSignal.removeEventListener("abort", onAbort);
                }
                await new Promise((resolve, reject) => {
                    const delayTimer = setTimeout(resolve, 400);
                    if (externalSignal) {
                        externalSignal.addEventListener("abort", () => {
                            clearTimeout(delayTimer);
                            reject(new Error("Tool execution aborted by caller"));
                        }, { once: true });
                    }
                });
                return await this.rawFetch(pathname, init, externalSignal, false);
            }
            throw error;
        }
        finally {
            clearTimeout(timer);
            if (externalSignal) {
                externalSignal.removeEventListener("abort", onAbort);
            }
        }
    }
    /**
     * 判断是否属于网络连接瞬态未就绪或抖动错误（TCP 未握手，重试绝对安全）。
     */
    isTransientNetworkError(error) {
        const message = error instanceof Error ? error.message : String(error);
        // @ts-ignore
        const cause = error instanceof Error ? error.cause?.message || "" : "";
        const combined = `${message} ${cause}`;
        return (combined.includes("ECONNREFUSED") ||
            combined.includes("fetch failed") ||
            combined.includes("ENOTFOUND") ||
            combined.includes("ECONNRESET"));
    }
    /**
     * 将 Fetch 抛出的底层网络异常包装成对模型及用户友好的提示。
     */
    normalizeNetworkError(error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.startsWith("[Awesome Canvas")) {
            return error instanceof Error ? error : new Error(message);
        }
        if (message.includes("ECONNREFUSED") ||
            message.includes("fetch failed") ||
            message.includes("ENOTFOUND")) {
            return new Error(`[Awesome Canvas 网关未就绪] 无法连接到本地网关 (${this.url})。\n请确认前端开发服务已启动（在 Awesome-Canvas 根目录运行 npm run dev 会随前端自动拉起网关并在 17371 端口监听）。`);
        }
        return new Error(`[Awesome Canvas 网关连接错误] ${message}`);
    }
}
//# sourceMappingURL=client.js.map