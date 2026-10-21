"use client";

import { useEffect, useRef, useState } from "react";
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
import { useProjectInfo } from "@/providers/project-provider";
import { useSession } from "@/providers/session-provider";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { UPLOAD_MESSAGES } from "@/lib/video-upload";
import { sortVideoDrop } from "@/lib/video-drop";
import { useVideoUploadQueue } from "@/lib/use-video-upload-queue";
import { formatSize, VideoUploadList } from "../video-upload-list";

type Phase = "edit" | "uploading" | "finished";

export function AddVideoDialog() {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [reading, setReading] = useState(false);
  const [phase, setPhase] = useState<Phase>("edit");
  const inputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const { _id: pid } = useProjectInfo();
  const session = useSession();
  const searchParams = useSearchParams();
  const ownerId = searchParams.get("owner") ?? session.user._id;
  const shareId = searchParams.get("share") ?? undefined;
  const qc = useQueryClient();
  const projectKey = ["project", session.user._id, pid, session.token, ownerId, shareId];
  const queue = useVideoUploadQueue();
  const isAnonymous = session.user.type === "anonymous";

  async function addFiles(list: File[]) {
    if (list.length === 0) return;
    setReading(true);
    try {
      const { videos, images, errors } = await sortVideoDrop(list);
      // E7 in an existing project: images are rejected, the rest go on.
      const all = [
        ...errors,
        ...images.map((f) => `${f.name}: ${UPLOAD_MESSAGES.projectType} (this is a video project).`),
      ];
      setErrors(all);
      if (videos.length > 0) setFiles((prev) => [...prev, ...videos]);
    } finally {
      setReading(false);
    }
  }

  async function handleAdd() {
    setPhase("uploading");
    const summary = await queue.run({
      files,
      uid: session.user._id,
      pid,
      token: session.token,
      onUploaded: (_video, version) => {
        if (version !== undefined) {
          qc.setQueryData(projectKey, (old: any) =>
            old ? { ...old, version: Math.max(old.version ?? 0, version) } : old,
          );
        }
        qc.invalidateQueries({ queryKey: projectKey, refetchType: "all" });
      },
    });

    if (summary.done > 0) {
      toast({
        title:
          summary.done === 1 ? "Video added successfully." : `${summary.done} videos added successfully.`,
      });
    }
    if (summary.failed === 0) {
      setOpen(false);
      return;
    }
    setPhase("finished"); // keep the list on screen so the failures can be read
  }

  useEffect(() => {
    if (open) return;
    setFiles([]);
    setErrors([]);
    setPhase("edit");
    queue.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (phase === "uploading" && !next) return; // cancel the uploads instead
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button className="inline-flex" variant="outline">
          <Plus /> Add Video
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add Video</DialogTitle>
          <DialogDescription>Add one or more videos to your project.</DialogDescription>
        </DialogHeader>

        {isAnonymous ? (
          <p className="text-sm text-destructive">{UPLOAD_MESSAGES.profile}</p>
        ) : (
          phase === "edit" && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => !reading && inputRef.current?.click()}
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
                if (!reading) void addFiles(Array.from(e.dataTransfer.files));
              }}
              className={cn(
                "flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-8 text-center cursor-pointer transition-colors",
                dragOver ? "border-primary bg-accent" : "border-muted-foreground/30",
              )}
            >
              {reading ? (
                <LoaderCircle className="size-8 animate-spin text-muted-foreground" />
              ) : (
                <Upload className="size-8 text-muted-foreground" />
              )}
              <p className="text-sm font-medium">
                {reading ? "Reading the zip..." : "Drag and drop videos or a .zip, or click to choose"}
              </p>
              <p className="text-xs text-muted-foreground">
                MP4, WEBM or MOV · up to 500 MB and 10 minutes each
              </p>
            </div>
          )
        )}

        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.zip,application/zip"
          onChange={(e) => {
            void addFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />

        {errors.length > 0 && phase === "edit" && (
          <ul className="text-sm text-destructive">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        )}

        {phase === "edit" && files.length > 0 && (
          <div className="flex max-h-48 flex-col gap-2 overflow-y-auto">
            {files.map((file, i) => (
              <div key={file.name + i} className="flex items-center gap-3 rounded-md border p-2">
                <FileVideo className="size-6 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                  title="Remove"
                >
                  <X className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {phase !== "edit" && <VideoUploadList items={queue.items} onCancel={queue.cancel} />}

        <DialogFooter>
          {phase === "uploading" && (
            <Button variant="outline" onClick={queue.cancelAll}>
              Cancel all
            </Button>
          )}
          {phase === "finished" ? (
            <Button onClick={() => setOpen(false)}>Close</Button>
          ) : (
            <Button
              onClick={handleAdd}
              disabled={files.length === 0 || phase !== "edit" || reading || isAnonymous}
              className="inline-flex items-center gap-1"
            >
              <span>Add</span>
              {phase === "uploading" && <LoaderCircle className="size-[1em] animate-spin" />}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
