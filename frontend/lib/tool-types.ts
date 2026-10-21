export interface BinarizationToolParams {
  threshold: number; // 0-255
}

export interface BorderToolParams {
  borderWidth: number;
  r: number;
  g: number;
  b: number;
}

export interface BrightnessToolParams {
  brightness: number; // 0.0 - 2.0 (1.0 normal image)
}

export interface ContrastToolParams {
  contrastFactor: number; // 0.0 - 2.0 (1.0 normal image)
}

export interface CropToolParams {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface ResizeToolParams {
  width: number;
  height: number;
}

export interface RotateToolParams {
  degrees: number; // 0 - 360
}

export interface SaturationToolParams {
  saturationFactor: number; // 0.0 - 2.0 (1.0 normal image)
}

export interface TrimToolParams {
  videoId: string; // the video it applies to
  startTime: number; // seconds
  endTime: number; // seconds
}

export interface CompressToolParams {
  videoId: string; // the video it applies to
  // light = best quality / bigger file, strong = smallest file / lower quality
  level: "light" | "medium" | "strong";
}

export type ExpandMode = "reflect" | "edge" | "solid" | "generative";

export type ExpandAiParams = {
  // UI atual
  percent?: number; // 1..200

  top: number;
  right: number;
  bottom: number;
  left: number;

  // modos
  mode?: ExpandMode;

  // solid only
  color?: string;

  // RF40 generative
  prompt?: string;
  negativePrompt?: string;
  seed?: number;
  steps?: number;
  guidance?: number;
};

export type ToolParams =
  | BinarizationToolParams
  | BorderToolParams
  | BrightnessToolParams
  | ContrastToolParams
  | CropToolParams
  | ResizeToolParams
  | RotateToolParams
  | SaturationToolParams
  | CompressToolParams
  | ExpandAiParams
  | TrimToolParams
  | object;

export type ToolNames =
  | "border"
  | "brightness"
  | "contrast"
  | "cut"
  | "scale"
  | "saturation"
  | "binarization"
  | "rotate"
  | "resize"
  | "watermark"
  | "cut_ai"
  | "upgrade_ai"
  | "bg_remove_ai"
  | "text_ai"
  | "obj_ai"
  | "people_ai"
  | "expand_ai"
  | "trim"
  | "compress"
  | "project";

// ---------------------------------------------------------------------------
// Video tools
// ---------------------------------------------------------------------------

// Tools that only work on video projects.
// Keep in sync with VIDEO_TOOLS in projects/routes/projects.js: the backend rejects
// any tool that is not allowed for the project's type.
export const VIDEO_TOOL_NAMES: ToolNames[] = ["trim", "compress"];

// In a video project each tool targets the video that was open in the player
// (params.videoId). Same rule as toolAppliesTo() in the projects service: old
// tools without a videoId apply to every video.
export function toolAppliesToVideo(tool: { params?: unknown }, videoId: string): boolean {
  const target = (tool.params as { videoId?: string } | undefined)?.videoId;
  return !target || target === videoId;
}

// Same rule as toolAllowedFor() in the projects service: video projects only get
// video tools, image projects get everything else.
export function isToolAllowedFor(
  projectType: "image" | "video" | undefined,
  tool: ToolNames,
): boolean {
  const isVideoTool = VIDEO_TOOL_NAMES.includes(tool);
  return projectType === "video" ? isVideoTool : !isVideoTool;
}
