import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import { resolveGatewayConfig, CONFIG_FILE, CONFIG_DIR } from "../lib/config.js";
import { createToolDefinitions, registerCanvasTools, formatToolOutput } from "../lib/tools.js";
import { CanvasGatewayClient } from "../lib/client.js";
import { apply } from "../lib/index.js";

test("formatToolOutput compacts large outputs to save LLM tokens", () => {
  // 1. 字符串直接返回
  assert.equal(formatToolOutput("hello world"), "hello world");

  // 2. 小对象保留格式化便检视
  const small = { ok: true, count: 1 };
  assert.equal(formatToolOutput(small), JSON.stringify(small, null, 2));

  // 3. 大对象（如画布节点列表，>600 字符）自动致密压缩，消除换行与空白 token
  const bigNodes = Array.from({ length: 30 }, (_, i) => ({
    id: `node-${i}`,
    title: `Image Node #${i}`,
    x: i * 100,
    y: i * 50,
    width: 320,
    height: 240,
    metadata: { generated: true, model: "flux-schnell" },
  }));
  const formatted = formatToolOutput(bigNodes);
  assert.ok(formatted.length > 600);
  assert.equal(formatted, JSON.stringify(bigNodes));
  assert.ok(!formatted.includes("\n"));
});

test("CanvasGatewayClient self-heals on 401 by reloading updated local token", async () => {
  let callCount = 0;
  const oldToken = "old-expired-token";
  const freshToken = "new-refreshed-token";

  // 启动本地 mock 网关
  const server = http.createServer((req, res) => {
    callCount++;
    const auth = req.headers["x-canvas-agent-token"];
    if (auth !== freshToken) {
      res.writeHead(401, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "Unauthorized" }));
      return;
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, result: { message: "recovered" } }));
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const url = `http://127.0.0.1:${port}`;

  // 准备本地配置文件
  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
  const backupConfig = fs.existsSync(CONFIG_FILE) ? fs.readFileSync(CONFIG_FILE, "utf8") : null;

  try {
    // 初始写入旧 token
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ url, token: oldToken }));

    const client = new CanvasGatewayClient({ url, token: oldToken, source: "local_file" });

    // 模拟服务端重启后更新了磁盘上的 token
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ url, token: freshToken }));

    // 发起工具调用：期望自动拦截 401，重读本地配置并透明重试成功
    const result = await client.callTool("test_tool", {});
    assert.deepEqual(result, { message: "recovered" });
    assert.equal(callCount, 2); // 第一次 401，第二次带 freshToken 成功
    assert.equal(client.getConfig().token, freshToken);
  } finally {
    server.close();
    if (backupConfig) {
      fs.writeFileSync(CONFIG_FILE, backupConfig);
    } else if (fs.existsSync(CONFIG_FILE)) {
      fs.unlinkSync(CONFIG_FILE);
    }
  }
});

test("resolveGatewayConfig correctly resolves local and fallback settings", () => {
  const custom = resolveGatewayConfig({
    url: "http://192.168.1.100:18888",
    token: "my-secret-token",
  });
  assert.equal(custom.url, "http://192.168.1.100:18888");
  assert.equal(custom.token, "my-secret-token");
  assert.equal(custom.source, "explicit");

  const auto = resolveGatewayConfig({});
  assert.ok(auto.url.startsWith("http://"));
  assert.ok(auto.source === "local_file" || auto.source === "default");
});

test("createToolDefinitions respects 'core' vs 'all' modes", () => {
  const dummyClient = new CanvasGatewayClient({ url: "http://127.0.0.1:17371", token: "test", source: "default" });

  const coreTools = createToolDefinitions(dummyClient, { mode: "core" });
  assert.equal(coreTools.length, 10);
  const coreNames = coreTools.map((t) => t.name);
  assert.ok(coreNames.includes("canvas_get_state"));
  assert.ok(coreNames.includes("canvas_apply_ops"));
  assert.ok(coreNames.includes("canvas_create_generation_flow"));

  const allTools = createToolDefinitions(dummyClient, { mode: "all" });
  assert.equal(allTools.length, 30);
  const allNames = allTools.map((t) => t.name);
  assert.ok(allNames.includes("canvas_move_nodes"));
  assert.ok(allNames.includes("canvas_delete_nodes"));
  assert.ok(allNames.includes("canvas_connect_nodes"));
});

test("createToolDefinitions supports custom prefix", () => {
  const dummyClient = new CanvasGatewayClient({ url: "http://127.0.0.1:17371", token: "test", source: "default" });
  const prefixedTools = createToolDefinitions(dummyClient, { mode: "core", prefix: "awesome_" });
  const names = prefixedTools.map((t) => t.name);
  assert.ok(names.includes("awesome_get_state"));
  assert.ok(names.includes("awesome_apply_ops"));
});

test("registerCanvasTools registers tools with DSH tools service and unregisters cleanly", () => {
  const registered = new Map();
  const mockToolsService = {
    register(def) {
      registered.set(def.name, def);
      return () => registered.delete(def.name);
    },
  };

  const dummyClient = new CanvasGatewayClient({ url: "http://127.0.0.1:17371", token: "test", source: "default" });
  const dispose = registerCanvasTools(mockToolsService, dummyClient, { mode: "core" });

  assert.equal(registered.size, 10);
  assert.ok(registered.has("canvas_get_state"));

  // 卸载
  dispose();
  assert.equal(registered.size, 0);
});

test("apply hook safely attaches to Cordis context", () => {
  const registered = new Map();
  const mockCtx = {
    tools: {
      register(def) {
        registered.set(def.name, def);
        return () => registered.delete(def.name);
      },
    },
    logger: {
      info() {},
      warn() {},
      error() {},
    },
    effect(fn) {
      const cleanup = fn();
      return cleanup;
    },
  };

  const instance = apply(mockCtx, { mode: "core" });
  assert.ok(instance);
  assert.equal(registered.size, 10);

  instance.dispose();
  assert.equal(registered.size, 0);
});

test("apply hook dynamically reloads tools and timeout on canvas-agent.json update", async () => {
  const registered = new Map();
  const logs = [];
  const mockCtx = {
    tools: {
      register(def) {
        registered.set(def.name, def);
        return () => registered.delete(def.name);
      },
    },
    logger: {
      info(msg) { logs.push(msg); },
      warn(msg) { logs.push(msg); },
      error(msg) { logs.push(msg); },
    },
    effect(fn) {
      return fn();
    },
  };

  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
  const backup = fs.existsSync(CONFIG_FILE) ? fs.readFileSync(CONFIG_FILE, "utf8") : null;

  try {
    // 初始配置为 core
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ mode: "core", timeoutSeconds: 60 }));

    // 留空由插件自动继承本地配置
    const instance = apply(mockCtx, {});
    assert.equal(registered.size, 10);

    // 动态在前端设置面板修改为 all 模式并设置 180s 超时
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ mode: "all", timeoutSeconds: 180 }));

    // 等待防抖触发 (200ms debounce + 150ms buffer)
    await new Promise((resolve) => setTimeout(resolve, 350));

    // 验证热重载：模式自动切换至 all (30 个工具)
    assert.equal(registered.size, 30);
    assert.ok(registered.has("canvas_move_nodes"));

    instance.dispose();
    assert.equal(registered.size, 0);
  } finally {
    if (backup) {
      fs.writeFileSync(CONFIG_FILE, backup);
    } else if (fs.existsSync(CONFIG_FILE)) {
      fs.unlinkSync(CONFIG_FILE);
    }
  }
});
