import type { ToolMetadata } from "./types.js";
export declare const CORE_TOOL_NAMES: readonly ["canvas_get_state", "canvas_apply_ops", "canvas_create_generation_flow", "canvas_run_generation", "generation_get_status", "canvas_list_projects", "site_navigate", "prompts_search", "assets_list", "assets_add"];
export type CoreToolName = (typeof CORE_TOOL_NAMES)[number];
export declare const TOOL_CATALOG: Record<string, ToolMetadata>;
//# sourceMappingURL=schemas.d.ts.map