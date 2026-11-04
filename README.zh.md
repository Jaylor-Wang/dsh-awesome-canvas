# dsh-awesome-canvas

> **DeepSeek Harness (DSH) 原生直连 Awesome Canvas 极限画布插件**  
> 绕过外部 stdio 子进程管道，在 DSH 宿主内部原生直连 `127.0.0.1:17371` 画布常驻网关，实现零延迟、零进程开销的毫秒级双向画布调度。

[![npm version](https://img.shields.io/npm/v/dsh-awesome-canvas?color=blue)](https://www.npmjs.com/package/dsh-awesome-canvas)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub release](https://img.shields.io/github/v/release/Jaylor-Wang/dsh-awesome-canvas.svg)](https://github.com/Jaylor-Wang/dsh-awesome-canvas/releases)
[![DeepSeek Harness Compatibility](https://img.shields.io/badge/DSH-compatible-brightgreen)](https://github.com/deepseek-ai/deepseek-harness)

[English](README.md) | [中文](README.zh.md)

---

## 🌟 核心特性与架构优势

| 维度 | 传统 MCP stdio 模式 | DSH 原生直连模式 (`dsh-awesome-canvas`) |
| :--- | :--- | :--- |
| **通信链路** | `DSH -> stdio 管道 -> Node.js 子进程 -> 本机 HTTP/WS -> 画布` | `DSH 宿主进程 -> 本机 HTTP 直连 -> 画布` |
| **子进程消耗** | 需为每次会话单独 spawn 一个 Node 进程，占用独立内存与 CPU | **0 额外进程**，纯原生 Node.js 全局 Fetch 驱动 |
| **调用延迟** | 经管道多重序列化与进程调度，延迟 100ms ~ 300ms | **< 2ms** 亚毫秒级高速直达 |
| **凭据感知** | 需在 mcpServers 中手动硬编码配置与 Token | **全自动发现与 401 自愈**，自动读取 `~/.awesome-canvas/canvas-agent.json`；网关重启 Token 刷新时自动透明原地重试 |
| **热更新能力** | 改配置需全量重启进程 | **全自动动态热重载**，前端面板一切换，DSH 动态热切换工具模式与超时，无需重启 |
| **上下文优化** | 容易被 30+ 工具撑爆上下文，格式化 JSON 占用大量空白 Token | **默认精简 Core 模式**（10 核心工具） + **大输出致密压缩**，节省 40%~60% Token 开销 |
| **异常行动力** | 原始报错堆栈，Agent 无法感知排查步骤 | **瞬态冷启动重试 + 语义化行动诊断**（网关未启动、网页未打开、Token 无效一目了然） |

---

## 📦 工具分层与模型策略

为防止大模型上下文膨胀与工具选择幻觉，本插件提供两级工具集模式：

### 1. 核心精简模式（Core Mode，默认推荐）
精选 10 个高频原子工具，覆盖 99% 的日常编排与创作场景：
1. `canvas_get_state`：获取画布状态与节点摘要（支持 `summaryOnly: true` 极致省流）。
2. `canvas_apply_ops`：原子批量修改画布（建点、连线、移动、改参、触发生成，支持全局撤销）。
3. `canvas_create_generation_flow`：一键创建文生文/图/视频/音频流程并自动连线。
4. `canvas_run_generation`：触发指定节点生成。
5. `generation_get_status`：查询生成任务进度（支持 `wait: true` 长轮询挂起等待）。
6. `canvas_list_projects`：罗列用户全部画布工程。
7. `site_navigate`：前端页面与工程路由跳转。
8. `prompts_search`：检索生图/生视频提示词与工作流模板库。
9. `assets_list`：浏览「我的资产」列表。
10. `assets_add`：将画布节点或素材一键收藏沉淀至资产库。

### 2. 全量模式（All Mode，可选）
包含全部 30 个细粒度控制工具（如单个节点微调 `canvas_move_nodes`、`canvas_resize_node`、`canvas_delete_nodes`、`canvas_set_viewport` 等）。

---

## 🚀 安装与在 DSH 中配置

### 安装方式

#### 方式 A：通过 DSH CLI（推荐）
```bash
dsh plugin --profile web add dsh-awesome-canvas
```

#### 方式 B：通过包管理器
```bash
# 在当前 DSH Profile 目录（如 ~/.dsh/profiles/web/）下执行：
pnpm add dsh-awesome-canvas
# 或 npm：
npm install dsh-awesome-canvas
# 本地开发时直接软链本地代码仓库：
pnpm add file:E:/Github/dsh-awesome-canvas
```

---

## ⚙️ 配置说明

### 1. 零配置模式（Zero-Config，默认推荐）

无需修改任何配置文件！插件通过 DSH 安装后即作为 Profile Bundle 自动挂载。
- **网关地址与凭据**：全自动读取 `~/.awesome-canvas/canvas-agent.json`。
- **默认模式**：`mode: "core"`（自动挂载 10 个高频原子工具）。
- **完全开箱即用，无需修改 `cordis.patch.yml`**。

### 2. 自定义参数覆盖（可选）

如需修改模式（切换为全量 30 工具）、修改前缀或调整超时，只需在 `~/.dsh/profiles/web/cordis.patch.yml` 中指定 bundle id `awesome-canvas` 按需覆盖特定字段：

**常用场景 A：开启全量 30 工具（按需覆盖，无需书写默认项）**
```yaml
- id: awesome-canvas
  config:
    mode: all           # 切换为全量 30 个工具（默认是 core 精简 10 工具）
```

**高级场景 B：自定义前缀与长超时**
```yaml
- id: awesome-canvas
  config:
    mode: all
    prefix: awesome_    # 自定义工具名前缀（默认即为 'canvas_'，仅在有命名冲突时自定义）
    timeoutMs: 120000   # 自定义超时（毫秒，默认 60000，长任务可按需调大）
```

> **注意**：已通过 DSH 安装时，请直接使用 `- id: awesome-canvas` 进行字段覆盖，切勿使用 `- insert:` 重复引入同名插件，以避免重复实例化。

### 3. 自定义网关地址与 Token（可选）

若网关部署在局域网其它机器或指定端口：
```yaml
- id: awesome-canvas
  config:
    url: 'http://192.168.1.100:17371'
    token: '你的自定义Token'
```

### 配置项参数表

| 字段 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `enabled` | `boolean` | `true` | 是否启用 Awesome Canvas 直连插件 |
| `mode` | `'core' \| 'all'` | `'core'` | 工具集暴露模式：`core`（10个高频推荐）或 `all`（30个全量工具） |
| `url` | `string` | `""` | 网关地址。留空则自动读取 `~/.awesome-canvas/canvas-agent.json` |
| `token` | `string` | `""` | 网关 Token。留空则自动读取 `~/.awesome-canvas/canvas-agent.json` |
| `prefix` | `string` | `'canvas_'` | 注册至 DSH 的工具名称前缀 |
| `timeoutMs` | `number` | `60000` | 单次工具调用 HTTP 超时时间（毫秒，默认 60 秒以兼容长等待任务） |

---

## 💡 自动化协同流程

1. **随前端无感守护**：在 Awesome-Canvas 运行 `npm run dev` 时，前端 Vite 守护进程会自动拉起 `127.0.0.1:17371` 网关。
2. **DSH 原生直连**：无需任何子进程中转，DSH 宿主内部即可直接派发工具调用。
3. **行动级诊断反馈**：
   - 若未启动前端开发服务，插件将提示：`[Awesome Canvas 网关未就绪] 无法连接到本地网关 (http://127.0.0.1:17371)。请先启动前端服务 (npm run dev)`。
   - 若未在浏览器中打开画布工程，插件将提示：`[Awesome Canvas 页面未连接] 请在浏览器打开 http://localhost:3000 并进入一个项目工程，保持页面开启。`

---

## 📄 授权许可

本项目采用 [MIT License](LICENSE) 开源。
