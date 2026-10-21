import { FileVideo, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { STATUS_LABEL, type VideoUploadItem } from "@/lib/use-video-upload-queue";

export function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const STATUS_STYLE = {
  queued: "text-muted-foreground",
  processing: "text-primary",
  done: "text-green-600",
  fail: "text-destructive",
} as const;

/** One row per file: name, status, progress bar and percentage, with a cancel button. */
export function VideoUploadList({
  items,
  onCancel,
}: {
  items: VideoUploadItem[];
  onCancel: (id: string) => void;
}) {
  return (
    <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
      {items.map((item) => {
        const active = item.status === "queued" || item.status === "processing";
        return (
          <div key={item.id} className="flex items-center gap-3 rounded-md border p-2">
            <FileVideo className="size-6 shrink-0 text-muted-foreground" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-sm font-medium">{item.file.name}</p>
                <span className={cn("shrink-0 text-xs font-medium", STATUS_STYLE[item.status])}>
                  {STATUS_LABEL[item.status]}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={item.percent} className="h-2" />
                <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                  {item.percent}%
                </span>
              </div>
              {item.error ? (
                <p className="text-xs text-destructive">{item.error}</p>
              ) : (
                <p className="text-xs text-muted-foreground">{formatSize(item.file.size)}</p>
              )}
            </div>
            {active && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onCancel(item.id)}
                title="Cancel upload"
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
