import { ToolbarButton } from "./toolbar-button";
import { Button } from "../ui/button";
import { Minimize2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useProjectInfo, useUnsavedChanges } from "@/providers/project-provider";
import type { CompressToolParams } from "@/lib/tool-types";

type Level = CompressToolParams["level"];

const LEVELS: { value: Level; label: string; hint: string }[] = [
  { value: "light", label: "Light", hint: "Best quality, bigger file" },
  { value: "medium", label: "Medium", hint: "Good balance" },
  { value: "strong", label: "Strong", hint: "Smallest file, lower quality" },
];

export default function CompressTool({ disabled }: { disabled: boolean }) {
  const project = useProjectInfo();
  const { setHasUnsavedChanges } = useUnsavedChanges();

  const defaultValue: Level = "medium";
  const [value, setValue] = useState<Level>(defaultValue);
  const [open, setOpen] = useState<boolean>(false);

  useEffect(() => {
    const compressTool = project.tools.find((t) => t.procedure === "compress");
    if (compressTool) {
      setValue((compressTool.params as CompressToolParams).level ?? defaultValue);
    } else {
      setValue(defaultValue);
    }
  }, [project.tools, open]);

  return (
    <ToolbarButton
      open={open}
      setOpen={setOpen}
      tool={{
        procedure: "compress",
        params: {
          level: value,
        },
      }}
      onDefault={() => {
        setValue(defaultValue);
        setHasUnsavedChanges(false);
      }}
      // Compression has no "neutral" value, so Save is always available.
      isDefault={false}
      // There is no quick preview for a video.
      noPreview
      disabled={disabled}
      icon={Minimize2}
      label="Compress"
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
    </ToolbarButton>
  );
}
