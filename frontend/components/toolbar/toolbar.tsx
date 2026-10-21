import { useSearchParams } from "next/navigation";
import BrightnessTool from "./brightness-tool";
import ContrastTool from "./contrast-tool";
import CropTool from "./crop-tool";
import ResizeTool from "./resize-tool";
import RotateTool from "./rotate-tool";
import SaturationTool from "./saturation-tool";
import BorderTool from "./border-tool";
import BinarizationTool from "./binarization-tool";
import WatermarkTool from "./watermark-tool";
import CropAITool from "./ai-crop-tool";
import BgRemovalAITool from "./ai-bg-removal";
import ObjectAITool from "./object-ai-tool";
import PeopleAITool from "./people-ai-tool";
import TextAITool from "./text-ai-tool";
import UpgradeAITool from "./upgrade-ai-tool";
import { useClearProjectTools } from "@/lib/mutations/projects";
import { useSession } from "@/providers/session-provider";
import { useProjectInfo } from "@/providers/project-provider";
import { Button } from "../ui/button";
import { AppliedToolsList } from "./applied-tools-list";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Eraser } from "lucide-react";
import { useState } from "react";
import ExpandAITool from "./expand-ai-tool";
import CompressTool from "./compress-tool";
import { isToolAllowedFor, VIDEO_TOOL_NAMES, type ToolNames } from "@/lib/tool-types";

export function Toolbar() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? "grid";
  const mode = searchParams.get("mode") ?? "edit";

  const project = useProjectInfo();
  const isVideo = project.type === "video";

  // desativar ferramentas se estiver em grid OU em results (igual nas imagens e nos vídeos:
  // só ficam ativas depois de abrir um item)
  const disabled = view === "grid" || mode === "results";
  const session = useSession();

  const [open, setOpen] = useState<boolean>(false);
  const ownerParam = searchParams.get("owner") ?? session.user._id;
  const shareId = searchParams.get("share") ?? undefined;

  const clearTools = useClearProjectTools(
    session.user._id,
    project._id,
    session.token,
    ownerParam,
    shareId,
  );

  // Image tools are hidden on video projects (the backend rejects them anyway).
  // The procedure names are the ones the backend knows.
  const show = (tool: ToolNames) => isToolAllowedFor(project.type, tool);

  return (
    <div className="flex h-full w-24 flex-col justify-between items-stretch border-r bg-background p-2">
      <div className="flex flex-col gap-2 items-center">
        <span className="text-sm text-gray-500">Tools</span>

        {show("brightness") && <BrightnessTool disabled={disabled} />}
        {show("contrast") && <ContrastTool disabled={disabled} />}
        {show("saturation") && <SaturationTool disabled={disabled} />}
        {show("binarization") && <BinarizationTool disabled={disabled} />}
        {show("rotate") && <RotateTool disabled={disabled} />}
        {show("cut") && <CropTool disabled={disabled} />}
        {show("resize") && <ResizeTool disabled={disabled} />}
        {show("border") && <BorderTool disabled={disabled} />}
        {show("watermark") && <WatermarkTool disabled={disabled} />}
        {show("bg_remove_ai") && <BgRemovalAITool disabled={disabled} />}
        {show("cut_ai") && <CropAITool disabled={disabled} />}
        {show("obj_ai") && <ObjectAITool disabled={disabled} />}
        {show("people_ai") && <PeopleAITool disabled={disabled} />}
        {show("text_ai") && <TextAITool disabled={disabled} />}
        {show("expand_ai") && <ExpandAITool disabled={disabled} />}
        {show("upgrade_ai") && <UpgradeAITool disabled={disabled} />}

        {/* Video tools: one line each */}
        {show("compress") && <CompressTool disabled={disabled} />}
        {isVideo && VIDEO_TOOL_NAMES.length === 0 && (
          <p className="px-1 text-center text-[11px] text-gray-400">
            No video tools available yet
          </p>
        )}

        <AppliedToolsList />
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="text-red-400 size-8"
            disabled={project.tools.length === 0}
          >
            <Eraser />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear Tools?</DialogTitle>
            <DialogDescription>
              This will remove <b>all</b> edits from the current project.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={() => {
                clearTools.mutate({
                  toolIds: project.tools.map((t) => t._id),
                  projectVersion: project.version,
                });
                setOpen(false);
              }}
            >
              Clear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
