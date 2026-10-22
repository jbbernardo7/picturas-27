import { ToolbarButton } from "./toolbar-button";
import { Button } from "../ui/button";
import { Minimize2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  useCurrentVideo,
  useProjectInfo,
  useUnsavedChanges,
} from "@/providers/project-provider";
import type { ProjectToolResponse } from "@/lib/projects";
import { videoHasExtraction, type CompressToolParams } from "@/lib/tool-types";

type Level = CompressToolParams["level"];

const LEVELS: { value: Level; label: string; hint: string }[] = [
  { value: "light", label: "Light", hint: "Best quality, bigger file" },
  { value: "medium", label: "Medium", hint: "Good balance" },
  { value: "strong", label: "Strong", hint: "Smallest file, lower quality" },
];

export default function CompressTool({ disabled }: { disabled: boolean }) {
  const project = useProjectInfo();
  // Compression applies only to the video open in the player.
  const video = useCurrentVideo();
  const videoId = video?._id ?? "";
  const { setHasUnsavedChanges } = useUnsavedChanges();

  const defaultValue: Level = "medium";
  const [value, setValue] = useState<Level>(defaultValue);
  const [open, setOpen] = useState<boolean>(false);

  const matchTool = useCallback(
    (t: ProjectToolResponse) =>
      t.procedure === "compress" &&
      (t.params as Partial<CompressToolParams>)?.videoId === videoId,
    [videoId],
  );

  useEffect(() => {
    const compressTool = project.tools.find(matchTool);
    if (compressTool) {
      setValue((compressTool.params as CompressToolParams).level ?? defaultValue);
    } else {
      setValue(defaultValue);
    }
  }, [project.tools, open, matchTool]);

  // UC-VID-003: nothing can be added after this video's frame extraction
  const blockedByExtraction =
    !!video && videoHasExtraction(project.tools, videoId) && !project.tools.some(matchTool);

  return (
    <ToolbarButton
      open={open}
      setOpen={setOpen}
      tool={{
        procedure: "compress",
        params: {
          videoId,
          level: value,
        },
      }}
      matchTool={matchTool}
      onDefault={() => {
        setValue(defaultValue);
        setHasUnsavedChanges(false);
      }}
      // Compression has no "neutral" value, so Save is always available.
      isDefault={false}
      // There is no quick preview for a video.
      noPreview
      disabled={disabled || !video || blockedByExtraction}
      icon={Minimize2}
      label={blockedByExtraction ? "Remove frame extraction to add more tools" : "Compress"}
    >
      <div className="flex w-full gap-1">
        {LEVELS.map((l) => (
          <Button
            key={l.value}
            type="button"
            variant={value === l.value ? "default" : "outline"}
            className="h-7 flex-1 text-xs"
            onClick={() => {
              setValue(l.value);
              setHasUnsavedChanges(true);
            }}
          >
            {l.label}
          </Button>
        ))}
      </div>
      <p className="pt-2 text-xs text-gray-500">
        {LEVELS.find((l) => l.value === value)?.hint}
      </p>
      {video && (
        <p className="truncate pt-1 text-xs text-gray-400" title={video.name}>
          Applies to {video.name}
        </p>
      )}
    </ToolbarButton>
  );
}
