import type { ToolMetadata } from "./types.js";

export const CORE_TOOL_NAMES = [
  "canvas_get_state",
  "canvas_apply_ops",
  "canvas_create_generation_flow",
  "canvas_run_generation",
  "generation_get_status",
  "canvas_list_projects",
  "site_navigate",
  "prompts_search",
  "assets_list",
  "assets_add",
] as const;

export type CoreToolName = (typeof CORE_TOOL_NAMES)[number];

const commonGenerationProperties = {
  model: { type: "string", description: "指定生成模型标识" },
  size: { type: "string", description: "生成尺寸（如 1024x1024、16:9）" },
  quality: { type: "string", description: "质量模式（如 standard、hd）" },
  count: { type: "number", description: "批量生成张数/个数" },
  seconds: { type: "string", description: "视频生成秒数（如 5s、10s）" },
  vquality: { type: "string", description: "视频质量清晰度" },
  generateAudio: { type: "string", description: "视频是否自带生成音效音频" },
  watermark: { type: "string", description: "是否启用水印" },
  videoMode: { type: "string", description: "视频生成模式" },
  audioVoice: { type: "string", description: "配音音色" },
  audioFormat: { type: "string", description: "音频输出格式" },
  audioSpeed: { type: "string", description: "音频语速倍率" },
  audioInstructions: { type: "string", description: "音频生成补充说明" },
};

export const TOOL_CATALOG: Record<string, ToolMetadata> = {
  // 1. 读取画布状态
  canvas_get_state: {
    name: "canvas_get_state",
    isCore: true,
    description:
      "读取当前网页画布状态（节点、连线、视口、revision 与 summary 概览）。支持传入 nodeTypes 过滤指定类型节点，传入 nodeIds 定向查询，或传入 summaryOnly: true 仅读取轻量状态概览以节省 Token。传入上次 revision 且无变化时返回 {unchanged:true}。",
    parameters: {
      type: "object",
      properties: {
        revision: { type: "number", description: "上次获取的 revision 版本号，用于增量检查" },
        nodeTypes: {
          type: "array",
          items: { type: "string", enum: ["image", "text", "config", "video", "audio"] },
          description: "仅返回指定类型的节点",
        },
        nodeIds: { type: "array", items: { type: "string" }, description: "仅返回指定 ID 的节点" },
        summaryOnly: { type: "boolean", description: "设为 true 则仅返回节点总数与概览，极大减少 Token 消耗" },
      },
    },
  },

  // 2. 原子批量修改画布
  canvas_apply_ops: {
    name: "canvas_apply_ops",
    isCore: true,
    description:
      "原子批量修改当前画布（建节点、改位置/大小、连线、设置视口、触发生成）。返回最新画布快照与各操作执行明细 appliedOps（包含新增/更新的节点 ID）。所有复杂写操作必须用此工具一次性完成，严禁拆成多次调用。支持撤销保护。",
    parameters: {
      type: "object",
      required: ["ops"],
      properties: {
        ops: {
          type: "array",
          description: "原子操作步骤序列",
          items: {
            type: "object",
            required: ["type"],
            properties: {
              type: {
                type: "string",
                enum: [
                  "add_node",
                  "update_node",
                  "delete_node",
                  "delete_connections",
                  "connect_nodes",
                  "set_viewport",
                  "select_nodes",
                  "run_generation",
                ],
                description: "操作类型",
              },
              nodeType: { type: "string", enum: ["image", "text", "config", "video", "audio"] },
              id: { type: "string" },
              ids: { type: "array", items: { type: "string" } },
              title: { type: "string" },
              x: { type: "number" },
              y: { type: "number" },
              width: { type: "number" },
              height: { type: "number" },
              fromNodeId: { type: "string" },
              toNodeId: { type: "string" },
              metadata: { type: "object" },
              patch: { type: "object" },
            },
          },
        },
      },
    },
  },

  // 3. 通用流程创建
  canvas_create_generation_flow: {
    name: "canvas_create_generation_flow",
    isCore: true,
    description:
      "创建通用生成流程（提示词节点 + 生成配置节点 + 参考节点连线）。支持传入 promptNodeId 直接复用画布已有提示词节点，避免重复建点；也可传入 referenceNodeIds 连接参考图/视频。可用于文案、生图、视频或音频。",
    parameters: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "生成提示词文本" },
        mode: { type: "string", enum: ["text", "image", "video", "audio"], description: "生成模式" },
        title: { type: "string", description: "节点标题" },
        x: { type: "number", description: "放置 X 坐标" },
        y: { type: "number", description: "放置 Y 坐标" },
        anchorNodeId: { type: "string", description: "参照定位的锚点节点 ID" },
        placement: { type: "string", enum: ["right", "bottom", "auto"], description: "相对锚点的排布方向" },
        promptNodeId: { type: "string", description: "复用已有提示词节点 ID" },
        referenceNodeIds: { type: "array", items: { type: "string" }, description: "作为参考图/参考视频连接的节点 ID 列表" },
        autoRun: { type: "boolean", description: "创建后是否立即触发生成" },
        ...commonGenerationProperties,
      },
    },
  },

  // 4. 触发节点生成
  canvas_run_generation: {
    name: "canvas_run_generation",
    isCore: true,
    description: "触发指定节点的生成任务调度，通常用于配置节点或文本/图片/视频/音频节点。",
    parameters: {
      type: "object",
      required: ["nodeId"],
      properties: {
        nodeId: { type: "string", description: "要触发生成的节点 ID" },
        mode: { type: "string", enum: ["text", "image", "video", "audio"], description: "覆盖的生成模式" },
        prompt: { type: "string", description: "临时覆盖的提示词" },
      },
    },
  },

  // 5. 查询生成任务状态
  generation_get_status: {
    name: "generation_get_status",
    isCore: true,
    description:
      "查询当前画布生成任务状态。支持 wait: true 挂起等待直到任务完成或超时（默认最长15秒，可通过 timeoutSeconds 设置），大幅减少轮询交互。支持传入 nodeIds 精确查询目标节点的生成进度与结果。",
    parameters: {
      type: "object",
      properties: {
        nodeIds: { type: "array", items: { type: "string" }, description: "定向查询的节点 ID 列表" },
        scope: { type: "string", enum: ["all", "canvas"], description: "查询范围" },
        limit: { type: "number", description: "返回数量上限" },
        wait: { type: "boolean", description: "是否阻塞挂起直到生成结束或超时" },
        timeoutSeconds: { type: "number", description: "挂起等待最长秒数（1-60s，默认15s）" },
      },
    },
  },

  // 6. 列出画布项目
  canvas_list_projects: {
    name: "canvas_list_projects",
    isCore: true,
    description: "列出用户全部画布工程概览。仅在需要查找、罗列或切换工程时调用。",
    parameters: {
      type: "object",
      properties: {
        keyword: { type: "string", description: "按标题关键字筛选" },
        page: { type: "number", description: "页码" },
        pageSize: { type: "number", description: "每页数量" },
      },
    },
  },

  // 7. 站点路由导航
  site_navigate: {
    name: "site_navigate",
    isCore: true,
    description: "跳转前端页面。可传 projectId 直接进入对应画布（跳转 /canvas/:id），或传 path 切换至 /、/assets 等。画布已打开时切勿重复调用。",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "目标 URL 路径，如 / 或 /assets" },
        projectId: { type: "string", description: "目标画布项目 ID，将跳转至 /canvas/:projectId" },
      },
    },
  },

  // 8. 检索提示词模板库
  prompts_search: {
    name: "prompts_search",
    isCore: true,
    description:
      "检索提示词模板库（生图/生视频模板），支持 keyword、type（all/image/video）与 tags 过滤。可设置 createNode: true 直接在当前画布生成对应的生图/生视频节点并填入提示词；也可传入 templateId 直接按指定模板在画布创建节点。",
    parameters: {
      type: "object",
      properties: {
        keyword: { type: "string", description: "模板关键词搜索" },
        type: { type: "string", enum: ["all", "image", "video"], description: "模板类型" },
        category: { type: "string", description: "分类" },
        tags: { type: "array", items: { type: "string" }, description: "标签过滤" },
        page: { type: "number" },
        pageSize: { type: "number" },
        createNode: { type: "boolean", description: "是否直接在画布上创建对应节点" },
        templateId: { type: "string", description: "指定选中的模板 ID" },
        targetType: { type: "string", enum: ["image", "video"] },
      },
    },
  },

  // 9. 我的资产列表
  assets_list: {
    name: "assets_list",
    isCore: true,
    description: "列出用户「我的资产」，支持 kind（text/image/video）过滤、keyword 搜索和 page/pageSize 分页。为控制体积不返回图片/视频原始 data，仅返回封面与元信息。",
    parameters: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["all", "text", "image", "video"], description: "资产类型" },
        keyword: { type: "string", description: "搜索关键字" },
        page: { type: "number" },
        pageSize: { type: "number" },
      },
    },
  },

  // 10. 新增资产
  assets_add: {
    name: "assets_add",
    isCore: true,
    description: "向「我的资产」新增资产。支持传入 nodeId 直接将画布已有节点（图片/文本）一键沉淀为资产；或通过 kind=text + content 传文本内容，kind=image + imageUrl 传图片。可附带 title、tags、source、note。",
    parameters: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["text", "image"], description: "资产类型" },
        title: { type: "string", description: "资产标题" },
        nodeId: { type: "string", description: "画布已有节点 ID，快速归档" },
        content: { type: "string", description: "文本内容" },
        imageUrl: { type: "string", description: "图片链接" },
        tags: { type: "array", items: { type: "string" }, description: "标签列表" },
        source: { type: "string", description: "来源" },
        note: { type: "string", description: "备注" },
      },
    },
  },

  // --- 进阶/全量扩展工具 (All 模式可用) ---

  canvas_get_selection: {
    name: "canvas_get_selection",
    isCore: false,
    description: "读取当前网页画布选中的节点列表。",
    parameters: { type: "object", properties: {} },
  },

  canvas_export_snapshot: {
    name: "canvas_export_snapshot",
    isCore: false,
    description: "导出当前画布完整快照，用于离线分析整体布局。",
    parameters: { type: "object", properties: {} },
  },

  canvas_create_node: {
    name: "canvas_create_node",
    isCore: false,
    description: "创建任意类型节点：text、image、config、video、audio。适合创建占位图、媒体占位、配置节点或自定义 metadata 节点。",
    parameters: {
      type: "object",
      required: ["nodeType"],
      properties: {
        nodeType: { type: "string", enum: ["image", "text", "config", "video", "audio"] },
        title: { type: "string" },
        x: { type: "number" },
        y: { type: "number" },
        width: { type: "number" },
        height: { type: "number" },
        anchorNodeId: { type: "string" },
        placement: { type: "string", enum: ["right", "bottom", "auto"] },
        metadata: { type: "object" },
      },
    },
  },

  canvas_create_attachment_nodes: {
    name: "canvas_create_attachment_nodes",
    isCore: false,
    description: "把当前对话中用户上传的图片附件创建成真实画布图片节点。attachmentIds 使用本轮附件清单中的 ID；返回的节点 ID 可传给生成流程作为参考图。",
    parameters: {
      type: "object",
      required: ["attachmentIds"],
      properties: {
        attachmentIds: { type: "array", items: { type: "string" } },
        x: { type: "number" },
        y: { type: "number" },
        gap: { type: "number" },
        direction: { type: "string", enum: ["row", "column"] },
      },
    },
  },

  canvas_create_text_node: {
    name: "canvas_create_text_node",
    isCore: false,
    description: "在当前画布创建单个文本节点。",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string", description: "文本内容" },
        title: { type: "string" },
        x: { type: "number" },
        y: { type: "number" },
        width: { type: "number" },
        height: { type: "number" },
        anchorNodeId: { type: "string" },
        placement: { type: "string", enum: ["right", "bottom", "auto"] },
      },
    },
  },

  canvas_create_text_nodes: {
    name: "canvas_create_text_nodes",
    isCore: false,
    description: "批量创建文本节点，适合生成标题、段落、脚本、说明等内容块。",
    parameters: {
      type: "object",
      required: ["items"],
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            required: ["text"],
            properties: {
              text: { type: "string" },
              title: { type: "string" },
              x: { type: "number" },
              y: { type: "number" },
              width: { type: "number" },
              height: { type: "number" },
            },
          },
        },
        x: { type: "number" },
        y: { type: "number" },
        gap: { type: "number" },
        direction: { type: "string", enum: ["row", "column"] },
      },
    },
  },

  canvas_create_config_node: {
    name: "canvas_create_config_node",
    isCore: false,
    description: "创建生成配置节点，可指定 text/image/video/audio 模式和生成参数，可选择立即触发生成。",
    parameters: {
      type: "object",
      properties: {
        prompt: { type: "string" },
        mode: { type: "string", enum: ["text", "image", "video", "audio"] },
        title: { type: "string" },
        x: { type: "number" },
        y: { type: "number" },
        width: { type: "number" },
        height: { type: "number" },
        anchorNodeId: { type: "string" },
        placement: { type: "string", enum: ["right", "bottom", "auto"] },
        autoRun: { type: "boolean" },
        ...commonGenerationProperties,
      },
    },
  },

  canvas_create_image_prompt_flow: {
    name: "canvas_create_image_prompt_flow",
    isCore: false,
    description: "创建提示词文本节点和图片生成配置节点，并自动连线，可选择立即触发生图。",
    parameters: {
      type: "object",
      required: ["prompt"],
      properties: {
        prompt: { type: "string" },
        x: { type: "number" },
        y: { type: "number" },
        autoRun: { type: "boolean" },
        ...commonGenerationProperties,
      },
    },
  },

  canvas_generate_text: {
    name: "canvas_generate_text",
    isCore: false,
    description: "创建通用文本生成流程并立即触发生成。",
    parameters: {
      type: "object",
      properties: {
        prompt: { type: "string" },
        title: { type: "string" },
        x: { type: "number" },
        y: { type: "number" },
        anchorNodeId: { type: "string" },
        ...commonGenerationProperties,
      },
    },
  },

  canvas_generate_image: {
    name: "canvas_generate_image",
    isCore: false,
    description: "创建通用图片生成流程并立即触发生成。",
    parameters: {
      type: "object",
      properties: {
        prompt: { type: "string" },
        title: { type: "string" },
        x: { type: "number" },
        y: { type: "number" },
        anchorNodeId: { type: "string" },
        referenceNodeIds: { type: "array", items: { type: "string" } },
        ...commonGenerationProperties,
      },
    },
  },

  canvas_generate_video: {
    name: "canvas_generate_video",
    isCore: false,
    description: "创建通用视频生成流程并立即触发生成。",
    parameters: {
      type: "object",
      properties: {
        prompt: { type: "string" },
        title: { type: "string" },
        x: { type: "number" },
        y: { type: "number" },
        anchorNodeId: { type: "string" },
        referenceNodeIds: { type: "array", items: { type: "string" } },
        ...commonGenerationProperties,
      },
    },
  },

  canvas_generate_audio: {
    name: "canvas_generate_audio",
    isCore: false,
    description: "创建通用音频生成流程并立即触发生成。",
    parameters: {
      type: "object",
      properties: {
        prompt: { type: "string" },
        title: { type: "string" },
        x: { type: "number" },
        y: { type: "number" },
        anchorNodeId: { type: "string" },
        ...commonGenerationProperties,
      },
    },
  },

  canvas_update_node: {
    name: "canvas_update_node",
    isCore: false,
    description: "更新指定节点的基础字段或 metadata。",
    parameters: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string" },
        patch: { type: "object" },
        metadata: { type: "object" },
      },
    },
  },

  canvas_update_node_text: {
    name: "canvas_update_node_text",
    isCore: false,
    description: "更新文本节点内容和标题。",
    parameters: {
      type: "object",
      required: ["id", "text"],
      properties: {
        id: { type: "string" },
        text: { type: "string" },
        title: { type: "string" },
      },
    },
  },

  canvas_move_nodes: {
    name: "canvas_move_nodes",
    isCore: false,
    description: "移动一个或多个节点，支持绝对坐标或 dx/dy 偏移。",
    parameters: {
      type: "object",
      required: ["items"],
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            required: ["id"],
            properties: {
              id: { type: "string" },
              x: { type: "number" },
              y: { type: "number" },
              dx: { type: "number" },
              dy: { type: "number" },
            },
          },
        },
      },
    },
  },

  canvas_resize_node: {
    name: "canvas_resize_node",
    isCore: false,
    description: "调整指定节点的宽高尺寸。",
    parameters: {
      type: "object",
      required: ["id", "width", "height"],
      properties: {
        id: { type: "string" },
        width: { type: "number" },
        height: { type: "number" },
        freeResize: { type: "boolean" },
      },
    },
  },

  canvas_delete_nodes: {
    name: "canvas_delete_nodes",
    isCore: false,
    description: "批量删除指定节点及与其关联的所有连线。",
    parameters: {
      type: "object",
      required: ["ids"],
      properties: {
        ids: { type: "array", items: { type: "string" } },
      },
    },
  },

  canvas_connect_nodes: {
    name: "canvas_connect_nodes",
    isCore: false,
    description: "批量连接节点（创建有向连线）。",
    parameters: {
      type: "object",
      required: ["connections"],
      properties: {
        connections: {
          type: "array",
          items: {
            type: "object",
            required: ["fromNodeId", "toNodeId"],
            properties: {
              fromNodeId: { type: "string" },
              toNodeId: { type: "string" },
            },
          },
        },
      },
    },
  },

  canvas_select_nodes: {
    name: "canvas_select_nodes",
    isCore: false,
    description: "设置当前画布中选中的节点。",
    parameters: {
      type: "object",
      required: ["ids"],
      properties: {
        ids: { type: "array", items: { type: "string" } },
      },
    },
  },

  canvas_set_viewport: {
    name: "canvas_set_viewport",
    isCore: false,
    description: "调整画布视口位置与缩放级别（x, y, k）。",
    parameters: {
      type: "object",
      required: ["viewport"],
      properties: {
        viewport: {
          type: "object",
          required: ["x", "y", "k"],
          properties: {
            x: { type: "number" },
            y: { type: "number" },
            k: { type: "number" },
          },
        },
      },
    },
  },
};
