import test from "node:test";
import assert from "node:assert/strict";
import { resolveGatewayConfig } from "../lib/config.js";
import { createToolDefinitions, registerCanvasTools } from "../lib/tools.js";
import { CanvasGatewayClient } from "../lib/client.js";
import { apply } from "../lib/index.js";

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
