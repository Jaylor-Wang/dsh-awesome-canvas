# dsh-awesome-canvas

> **Native Zero-Latency Cordis Direct Plugin for Awesome Canvas in DeepSeek Harness (DSH)**  
> Bypasses external stdio sub-processes to communicate directly with the Awesome Canvas resident gateway at `127.0.0.1:17371`, providing zero-latency, sub-millisecond bidirectional canvas control.

[![npm version](https://img.shields.io/npm/v/dsh-awesome-canvas?color=blue)](https://www.npmjs.com/package/dsh-awesome-canvas)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub release](https://img.shields.io/github/v/release/Jaylor-Wang/dsh-awesome-canvas.svg)](https://github.com/Jaylor-Wang/dsh-awesome-canvas/releases)
[![DeepSeek Harness Compatibility](https://img.shields.io/badge/DSH-compatible-brightgreen)](https://github.com/deepseek-ai/deepseek-harness)

[English](README.md) | [中文](README.zh.md)

---

## 🌟 Highlights & Architectural Advantages

| Dimension | Standard MCP stdio Mode | DSH Native Direct Mode (`dsh-awesome-canvas`) |
| :--- | :--- | :--- |
| **Communication Chain** | `DSH -> stdio Pipe -> Node.js Sub-process -> HTTP/WS -> Canvas` | `DSH Host Process -> Native Direct HTTP -> Canvas` |
| **Process Overhead** | Spawns a dedicated Node process per session with extra memory & CPU | **0 extra processes**, powered purely by native Node.js global fetch |
| **Invocation Latency** | Pipe serialization & process scheduling overhead (100ms - 300ms) | **< 2ms** sub-millisecond instant dispatch |
| **Credential Discovery** | Requires manual token configuration in mcpServers | **Fully automatic discovery** from `~/.awesome-canvas/canvas-agent.json` |
| **Context Protection** | 30+ tools may overload LLM context budget | **Default Core Mode** (10 high-frequency atomic tools) to prevent hallucinations |
| **Actionable Error Feedback** | Raw stack traces unreadable to models | **Actionable semantic diagnostics** with clear resolution guides |

---

## 📦 Tool Hierarchy

### 1. Core Mode (`mode: "core"`, Default & Recommended)
10 high-frequency atomic tools covering 99% of daily orchestration workflows:
1. `canvas_get_state`: Query canvas state & node summary (supports `summaryOnly: true`).
2. `canvas_apply_ops`: Atomic batch canvas mutations (nodes, edges, layout, generation, with undo support).
3. `canvas_create_generation_flow`: One-shot generation pipeline builder (prompt + config + connections).
4. `canvas_run_generation`: Trigger node generation task.
5. `generation_get_status`: Query task execution status (supports `wait: true` long-polling).
6. `canvas_list_projects`: List all canvas projects.
7. `site_navigate`: Navigation across frontend pages and projects.
8. `prompts_search`: Search prompt & workflow templates.
9. `assets_list`: Browse user asset library.
10. `assets_add`: Archive canvas nodes or assets into the asset library.

### 2. All Mode (`mode: "all"`, Optional)
Includes all 30 granular tools (individual node updates, translations, resizing, deletions, and viewport controls).

---

## 🚀 Installation & Configuration in DSH

### Installation

#### Method A: Via DSH CLI (Recommended)
```bash
dsh plugin --profile web add dsh-awesome-canvas
```

#### Method B: Via Package Manager
```bash
# In your active DSH profile directory (e.g. ~/.dsh/profiles/web/):
pnpm add dsh-awesome-canvas
# or npm:
npm install dsh-awesome-canvas
# or link local source directory during development:
pnpm add file:E:/Github/dsh-awesome-canvas
```

---

## ⚙️ Configuration

### 1. Zero-Config Mode (Default & Recommended)

No manual configuration edits required! When installed via DSH, the plugin is loaded automatically as a profile bundle.
- **Gateway Endpoint & Token**: Automatically discovered from `~/.awesome-canvas/canvas-agent.json`.
- **Default Toolset**: `mode: "core"` (mounts 10 high-frequency atomic tools).
- **Ready out of the box without editing `cordis.patch.yml`**.

### 2. Custom Parameters Override (Optional)

To switch to all 30 granular tools, change tool prefixes, or adjust timeout, override specific fields targeting bundle id `awesome-canvas` in `~/.dsh/profiles/web/cordis.patch.yml`:

**Typical Scenario A: Enable All 30 Granular Tools (Only override needed fields)**
```yaml
- id: awesome-canvas
  config:
    mode: all           # Switch to all 30 granular tools (defaults to 'core' with 10 tools)
```

**Advanced Scenario B: Custom Tool Prefix & Longer Timeout**
```yaml
- id: awesome-canvas
  config:
    mode: all
    prefix: awesome_    # Custom tool prefix (defaults to 'canvas_', customize only on conflict)
    timeoutMs: 120000   # Custom per-call timeout in ms (defaults to 60000; adjust for long tasks)
```

> **Note**: When installed via DSH, always use `- id: awesome-canvas` for property overrides. Do not use `- insert:` to avoid creating duplicate plugin instances.

### 3. Custom Gateway URL & Token (Optional)

If the gateway is hosted on a remote local-network server or custom port:
```yaml
- id: awesome-canvas
  config:
    url: 'http://192.168.1.100:17371'
    token: 'your-custom-token'
```

### Configuration Options

| Field | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `enabled` | `boolean` | `true` | Whether the Awesome Canvas direct plugin is enabled. |
| `mode` | `'core' \| 'all'` | `'core'` | Tool exposure mode: `core` (10 high-frequency tools) or `all` (all 30 tools). |
| `url` | `string` | `""` | Gateway URL. When empty, automatically read from `~/.awesome-canvas/canvas-agent.json`. |
| `token` | `string` | `""` | Gateway Token. When empty, automatically read from `~/.awesome-canvas/canvas-agent.json`. |
| `prefix` | `string` | `'canvas_'` | Tool name prefix registered into DSH. |
| `timeoutMs` | `number` | `60000` | HTTP request timeout per tool invocation (ms, default 60s for long generation tasks). |

---

## 📄 License

Distributed under the [MIT License](LICENSE).
