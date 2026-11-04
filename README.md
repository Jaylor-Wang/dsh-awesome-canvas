# dsh-awesome-canvas

> **Native Zero-Latency Cordis Direct Plugin for Awesome Canvas in DeepSeek Harness (DSH)**  
> Bypasses external stdio sub-processes to communicate directly with the Awesome Canvas resident gateway at `127.0.0.1:17371`, providing zero-latency, sub-millisecond bidirectional canvas control.

[![npm version](https://img.shields.io/npm/v/dsh-awesome-canvas.svg)](https://www.npmjs.com/package/dsh-awesome-canvas)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

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

### Option 1: One-Click Integration into DSH Profile (Recommended)

1. Install the plugin in your DSH profile directory (e.g. `~/.dsh/profiles/web/`):
```bash
npm install dsh-awesome-canvas
```

2. Add the plugin entry to `~/.dsh/profiles/web/cordis.patch.yml` (or `cordis.yml`):
```yaml
- insert:
    - id: awesome-canvas
      name: dsh-awesome-canvas
      config:
        enabled: true
        mode: core          # Options: 'core' (recommended 10 tools) or 'all' (all 30 tools)
        prefix: canvas_     # Optional: tool name prefix (defaults to 'canvas_')
        timeoutMs: 30000    # Per-call timeout in milliseconds
```

3. Restart or refresh your DSH Web GUI. The plugin will automatically probe the resident gateway in the background.

### Option 2: Custom Endpoint and Token Override
```yaml
- id: awesome-canvas
  name: dsh-awesome-canvas
  config:
    url: 'http://127.0.0.1:17371'
    token: 'your-custom-token'
```

---

## 📄 License

Distributed under the [MIT License](LICENSE).
