"use client";

import { useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { FileVideo, LoaderCircle, Trash, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useCanEditProject, useProjectInfo } from "@/providers/project-provider";
import { useSession } from "@/providers/session-provider";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/error-messages";
import {
  describeUploadError,
  UploadCancelled,
  uploadVideo,
  validateVideoFile,
  type UploadProgress,
} from "@/lib/video-upload";
import { useDeleteProjectVideo } from "@/lib/mutations/videos";

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// Main area of a video project: the player, or an upload box if there is no video yet.
export function ProjectVideoView() {
  const project = useProjectInfo();
  const canEdit = useCanEditProject();
  const session = useSession();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const qc = useQueryClient();

  const pid = project._id;
  const ownerId = searchParams.get("owner") ?? session.user._id;
  const shareId = searchParams.get("share") ?? undefined;
  const isOwner = session.user._id === ownerId; // the backend only lets the owner manage videos
  const video = project.videos?.[0];

  const projectKey = ["project", session.user._id, pid, session.token, ownerId, shareId];

  const deleteVideo = useDeleteProjectVideo(
    session.user._id,
    pid,
    session.token,
    ownerId,
    shareId,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);

  // upload state (shown when the project has no video)
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function startUpload(file: File | undefined) {
    if (!file) return;
    const problem = validateVideoFile(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setUploading(true);

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const result = await uploadVideo({
        uid: session.user._id,
        pid,
        token: session.token,
        file,
        signal: controller.signal,
        onProgress: setProgress,
      });

      const v = Number(result.version);
      if (Number.isFinite(v)) {
        qc.setQueryData(projectKey, (old: any) => (old ? { ...old, version: v } : old));
      }
      qc.invalidateQueries({ queryKey: projectKey, refetchType: "all" });
      toast({ title: "Vídeo adicionado com sucesso." });
    } catch (err) {
      if (err instanceof UploadCancelled) {
        toast({ title: "Upload cancelado" });
      } else {
        const { title, description } = describeUploadError(err);
        toast({ title, description, variant: "destructive" });
      }
    } finally {
      abortRef.current = null;
      setUploading(false);
      setProgress(null);
    }
  }

  const percent =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.loaded * 100) / progress.total))
      : 0;

  // ---------- video present: player ----------
  if (video) {
    return (
      <div className="size-full flex flex-col items-center justify-center gap-4 p-4 overflow-auto">
        <video
          key={video._id}
          src={video.url}
          controls
          preload="metadata"
          className="max-h-[70vh] w-full max-w-4xl rounded-md bg-black"
        />
        <div className="flex w-full max-w-4xl items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{video.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatSize(video.size)} · {video.contentType}
            </p>
          </div>
          {isOwner && canEdit && (
            <Button
              variant="outline"
              className="inline-flex items-center gap-1"
              onClick={() => setConfirmOpen(true)}
              disabled={deleteVideo.isPending}
            >
              {deleteVideo.isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Trash className="size-4" />
              )}
              Delete video
            </Button>
          )}
        </div>

        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Are you sure?</DialogTitle>
              <DialogDescription>
                The video will be removed from this project. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end">
              <Button
                variant="destructive"
                onClick={() => {
                  setConfirmOpen(false);
                  deleteVideo.mutate(
                    { videoId: video._id, projectVersion: project.version },
                    {
                      onSuccess: () => toast({ title: `Vídeo ${video.name} eliminado.` }),
                      onError: (e) => {
                        const { title, description } = getErrorMessage("project-delete", e);
                        toast({ title, description, variant: "destructive" });
                      },
                    },
                  );
                }}
              >
                Permanently Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ---------- no video, can't upload ----------
  if (!isOwner || !canEdit) {
    return (
      <div className="size-full flex items-center justify-center">
        <p className="text-gray-500 text-xl">This project has no video.</p>
      </div>
    );
  }

  // ---------- no video, owner: upload box ----------
  return (
    <div className="size-full flex flex-col items-center justify-center gap-4 p-4">
      <div className="w-full max-w-xl flex flex-col gap-3">
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
            if (uploading) return;
            if (e.dataTransfer.files.length > 1) {
              setError("Drop a single video. A project holds only one.");
              return;
            }
            void startUpload(e.dataTransfer.files[0]);
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-12 text-center cursor-pointer transition-colors",
            dragOver ? "border-primary bg-accent" : "border-muted-foreground/30",
            uploading && "cursor-default opacity-80",
          )}
        >
          {uploading ? (
            <FileVideo className="size-10 text-muted-foreground" />
          ) : (
            <Upload className="size-10 text-muted-foreground" />
          )}
          <p className="text-lg font-medium">
            {uploading ? "Uploading video..." : "Drag and drop a video, or click to choose"}
          </p>
          <p className="text-sm text-muted-foreground">MP4, WebM or MOV. One video per project.</p>
        </div>

        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
          onChange={(e) => {
            void startUpload(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        {error && <p className="text-sm text-destructive">{error}</p>}

        {uploading && (
          <div className="flex flex-col gap-2">
            <Progress value={progress?.phase === "finishing" ? 100 : percent} />
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {!progress
                  ? "Starting..."
                  : progress.phase === "finishing"
                    ? "Finishing..."
                    : `${percent}% (${formatSize(progress.loaded)} of ${formatSize(progress.total)})`}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => abortRef.current?.abort()}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
