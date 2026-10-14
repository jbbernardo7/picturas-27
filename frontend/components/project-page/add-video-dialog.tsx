"use client";

import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { FileVideo, LoaderCircle, Plus, Upload, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useProjectInfo } from "@/providers/project-provider";
import { useSession } from "@/providers/session-provider";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  describeUploadError,
  UploadCancelled,
  uploadVideo,
  validateVideoFile,
  type UploadProgress,
} from "@/lib/video-upload";

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function AddVideoDialog() {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const stopRef = useRef(false);

  const { toast } = useToast();
  const { _id: pid } = useProjectInfo();
  const session = useSession();
  const searchParams = useSearchParams();
  const ownerId = searchParams.get("owner") ?? session.user._id;
  const shareId = searchParams.get("share") ?? undefined;
  const qc = useQueryClient();
  const projectKey = ["project", session.user._id, pid, session.token, ownerId, shareId];

  function addFiles(list: FileList | File[] | null) {
    if (!list) return;
    const accepted: File[] = [];
    const problems: string[] = [];
    for (const file of Array.from(list)) {
      const problem = validateVideoFile(file);
      if (problem) problems.push(`${file.name}: ${problem}`);
      else accepted.push(file);
    }
    setError(problems.length > 0 ? problems.join(" ") : null);
    if (accepted.length > 0) setFiles((prev) => [...prev, ...accepted]);
  }

  async function handleAdd() {
    stopRef.current = false;
    setUploading(true);
    let done = 0;

    for (let i = 0; i < files.length; i++) {
      if (stopRef.current) break;
      setCurrentIndex(i);
      setProgress(null);

      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const result = await uploadVideo({
          uid: session.user._id,
          pid,
          token: session.token,
          file: files[i],
          signal: controller.signal,
          onProgress: setProgress,
        });

        const v = Number(result.version);
        if (Number.isFinite(v)) {
          qc.setQueryData(projectKey, (old: any) => (old ? { ...old, version: v } : old));
        }
        qc.invalidateQueries({ queryKey: projectKey, refetchType: "all" });
        done++;
      } catch (err) {
        if (err instanceof UploadCancelled) {
          toast({ title: "Upload cancelado" });
        } else {
          const { title, description } = describeUploadError(err);
          toast({ title: `${title} (${files[i].name})`, description, variant: "destructive" });
        }
        break; // stop at the first problem
      }
    }

    abortRef.current = null;
    setUploading(false);
    setProgress(null);

    if (done > 0) {
      toast({
        title: done === 1 ? "Video added successfully." : `${done} videos added successfully.`,
      });
      setFiles([]);
      setOpen(false);
    }
  }

  const percent =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.loaded * 100) / progress.total))
      : 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (uploading && !next) return; // use Cancel instead
        setOpen(next);
        if (!next) {
          setFiles([]);
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button className="inline-flex" variant="outline">
          <Plus /> Add Video
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Video</DialogTitle>
          <DialogDescription>Add a video to your project.</DialogDescription>
        </DialogHeader>

        <div
          role="button"
          tabIndex={0}
          onClick={() => !uploading && inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (!uploading) addFiles(e.dataTransfer.files);
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-8 text-center cursor-pointer transition-colors",
            dragOver ? "border-primary bg-accent" : "border-muted-foreground/30",
            uploading && "cursor-default opacity-70",
          )}
        >
          <Upload className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium">Drag and drop videos, or click to choose</p>
          <p className="text-xs text-muted-foreground">MP4, WebM or MOV</p>
        </div>

        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {error && <p className="text-sm text-destructive">{error}</p>}

        {files.length > 0 && (
          <div className="flex max-h-40 flex-col gap-2 overflow-y-auto">
            {files.map((file, i) => (
              <div key={file.name + i} className="flex items-center gap-3 rounded-md border p-2">
                <FileVideo className="size-6 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                </div>
                {!uploading && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                    title="Remove"
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {uploading && (
          <div className="flex flex-col gap-1">
            <Progress value={progress?.phase === "finishing" ? 100 : percent} />
            <p className="text-xs text-muted-foreground">
              {files.length > 1 ? `Video ${currentIndex + 1} of ${files.length}: ` : ""}
              {!progress
                ? "Starting..."
                : progress.phase === "finishing"
                  ? "Finishing..."
                  : `${percent}% (${formatSize(progress.loaded)} of ${formatSize(progress.total)})`}
            </p>
          </div>
        )}

        <DialogFooter>
          {uploading && (
            <Button
              variant="outline"
              onClick={() => {
                stopRef.current = true;
                abortRef.current?.abort();
              }}
            >
              Cancel
            </Button>
          )}
          <Button
            onClick={handleAdd}
            disabled={files.length === 0 || uploading}
            className="inline-flex items-center gap-1"
          >
            <span>Add</span>
            {uploading && <LoaderCircle className="size-[1em] animate-spin" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
