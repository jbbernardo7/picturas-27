import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAddProject } from "@/lib/mutations/projects";
import ImageSubmissionArea from "../image-submission-area";
import { useSession } from "@/providers/session-provider";
import { FileVideo, ImageIcon, LoaderCircle, Upload, Video, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import JSZip from "jszip";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/error-messages";
import { deleteProject, type ProjectType } from "@/lib/projects";
import {
  describeUploadError,
  UploadCancelled,
  uploadVideo,
  validateVideoFile,
  type UploadProgress,
} from "@/lib/video-upload";

const VIDEO_EXT_TO_MIME: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
};

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// Finds the video inside a zip. A project holds exactly one video, so the zip must contain one.
async function extractVideoFromZip(zipFile: File): Promise<{ file?: File; error?: string }> {
  const zip = await JSZip.loadAsync(zipFile);
  const entries = Object.values(zip.files).filter((entry) => {
    if (entry.dir || entry.name.startsWith("__MACOSX/")) return false;
    const base = entry.name.split("/").pop() ?? "";
    if (base.startsWith(".")) return false;
    return Boolean(VIDEO_EXT_TO_MIME[base.split(".").pop()?.toLowerCase() ?? ""]);
  });

  if (entries.length === 0) return { error: "No MP4, WebM or MOV video found in the zip." };
  if (entries.length > 1) {
    return { error: `The zip has ${entries.length} videos, but a project holds only one.` };
  }

  const entry = entries[0];
  const base = entry.name.split("/").pop() as string;
  const mime = VIDEO_EXT_TO_MIME[base.split(".").pop()!.toLowerCase()];
  const blob = await entry.async("blob");
  return { file: new File([blob], base, { type: mime }) };
}

export default function NewProjectDialog({
  files = [],
  setFiles,
  children,
}: {
  files?: File[];
  setFiles?: (files: File[]) => void;
  children: React.ReactNode;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const qc = useQueryClient();

  const [open, setOpen] = useState<boolean>(false);
  const [name, setName] = useState<string>("");
  const [type, setType] = useState<ProjectType>("image");
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  // video project state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [reading, setReading] = useState(false); // extracting a zip
  const [busy, setBusy] = useState(false); // creating + uploading
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const session = useSession();
  const addProject = useAddProject(session.user._id, session.token);

  const canCreate =
    name !== "" &&
    !busy &&
    !reading &&
    (type === "video" ? videoFile !== null : imageFiles.length > 0);

  async function handleVideoFiles(list: FileList | File[] | null) {
    if (!list || list.length === 0) return;
    setVideoError(null);

    if (list.length > 1) {
      setVideoError("Drop a single video. A project holds only one.");
      return;
    }

    const dropped = list[0];
    const isZip =
      dropped.type === "application/zip" ||
      dropped.type === "application/x-zip-compressed" ||
      dropped.name.toLowerCase().endsWith(".zip");

    if (isZip) {
      setReading(true);
      try {
        const { file, error } = await extractVideoFromZip(dropped);
        if (error || !file) {
          setVideoError(error ?? "Could not read the zip.");
          return;
        }
        const problem = validateVideoFile(file);
        if (problem) {
          setVideoError(problem);
          return;
        }
        setVideoFile(file);
      } catch {
        setVideoError("Could not read the zip.");
      } finally {
        setReading(false);
      }
      return;
    }

    const problem = validateVideoFile(dropped);
    if (problem) {
      setVideoError(problem);
      return;
    }
    setVideoFile(dropped);
  }

  function handleCreateImages() {
    addProject.mutate(
      {
        uid: session.user._id,
        token: session.token,
        name: name,
        type: "image",
        images: imageFiles,
      },
      {
        onSuccess: (project) => {
          setOpen(false);
          toast({
            title: "Projeto criado com sucesso",
            description: "As imagens foram adicionadas ao novo projeto.",
          });
          if (project) router.push(`/dashboard/${project._id}`);
        },
        onError: (error) => {
          const { title, description } = getErrorMessage("project-create", error);
          toast({
            title,
            description,
            variant: "destructive",
          });
        },
      },
    );
  }

  async function handleCreateVideo() {
    if (!videoFile) return;
    const uid = session.user._id;
    const token = session.token;
    setBusy(true);

    // 1) create the (empty) video project
    let project;
    try {
      project = await addProject.mutateAsync({ uid, token, name, type: "video", images: [] });
    } catch (error) {
      const { title, description } = getErrorMessage("project-create", error);
      toast({ title, description, variant: "destructive" });
      setBusy(false);
      return;
    }

    // 2) upload the video to it
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await uploadVideo({
        uid,
        pid: project._id,
        token,
        file: videoFile,
        signal: controller.signal,
        onProgress: setProgress,
      });
      toast({
        title: "Projeto criado com sucesso",
        description: "O vídeo foi adicionado ao novo projeto.",
      });
      setBusy(false);
      setProgress(null);
      setOpen(false);
      router.push(`/dashboard/${project._id}`);
    } catch (error) {
      // Roll back: don't leave an empty video project behind. Best effort.
      try {
        await deleteProject({ uid, pid: project._id, token, projectVersion: project.version });
      } catch {}
      qc.invalidateQueries({ queryKey: ["projects", uid, token], refetchType: "all" });

      if (error instanceof UploadCancelled) {
        toast({ title: "Upload cancelado", description: "O projeto não foi criado." });
      } else {
        const { title, description } = describeUploadError(error);
        toast({ title, description, variant: "destructive" });
      }
      setBusy(false);
      setProgress(null);
    } finally {
      abortRef.current = null;
    }
  }

  function handleCreate() {
    if (type === "video") void handleCreateVideo();
    else handleCreateImages();
  }

  useEffect(() => {
    if (files.length > 0) {
      setOpen(true);
    }
  }, [files]);

  useEffect(() => {
    setName("");
    setImageFiles([]);
    setType("image");
    setVideoFile(null);
    setVideoError(null);
    setProgress(null);
    if (setFiles && open === false) setFiles([]);
  }, [open, setFiles]);

  // warn before leaving the page while a video is uploading
  useEffect(() => {
    if (!busy) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  const percent =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.loaded * 100) / progress.total))
      : 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // can't close while uploading, use the Cancel button instead
        if (busy && !next) return;
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>

        <Label>Project Type</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={type === "image" ? "default" : "outline"}
            onClick={() => setType("image")}
            disabled={busy}
            className="inline-flex items-center gap-2"
          >
            <ImageIcon className="size-4" /> Images
          </Button>
          <Button
            type="button"
            variant={type === "video" ? "default" : "outline"}
            onClick={() => setType("video")}
            disabled={busy}
            className="inline-flex items-center gap-2"
          >
            <Video className="size-4" /> Video
          </Button>
        </div>

        <Label htmlFor="project-name">Project Name</Label>
        <Input
          id="project-name"
          placeholder="Enter project name"
          value={name}
          disabled={busy}
          onChange={(e) => setName(e.target.value)}
        />

        {/* Hidden (not unmounted) for video projects, so dropped images aren't lost
            if the user switches the type back and forth. */}
        <div className={type === "image" ? "" : "hidden"}>
          <ImageSubmissionArea
            onDrop={(files) => setImageFiles(files)}
            receivedFiles={files}
          />
        </div>

        {type === "video" && (
          <div className="flex flex-col gap-2">
            {!videoFile ? (
              <div
                role="button"
                tabIndex={0}
                onClick={() => !busy && !reading && inputRef.current?.click()}
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
                  if (!busy && !reading) void handleVideoFiles(e.dataTransfer.files);
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
                  {reading
                    ? "Reading the zip..."
                    : "Drag and drop a video or a .zip, or click to choose"}
                </p>
                <p className="text-xs text-muted-foreground">
                  MP4, WebM or MOV. One video per project.
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-md border p-3">
                <FileVideo className="size-8 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{videoFile.name}</p>
                  <p className="text-xs text-muted-foreground">{formatSize(videoFile.size)}</p>
                </div>
                {!busy && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setVideoFile(null)}
                    title="Remove video"
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
            )}

            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.zip,application/zip"
              onChange={(e) => {
                void handleVideoFiles(e.target.files);
                e.target.value = ""; // allow choosing the same file again
              }}
            />

            {videoError && <p className="text-sm text-destructive">{videoError}</p>}

            {busy && (
              <div className="flex flex-col gap-1">
                <Progress value={progress?.phase === "finishing" ? 100 : percent} />
                <p className="text-xs text-muted-foreground">
                  {!progress
                    ? "Creating project..."
                    : progress.phase === "finishing"
                      ? "Finishing..."
                      : `Uploading... ${percent}% (${formatSize(progress.loaded)} of ${formatSize(progress.total)})`}
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {busy && type === "video" && (
            <Button
              type="button"
              variant="outline"
              onClick={() => abortRef.current?.abort()}
              disabled={!abortRef.current}
            >
              Cancel upload
            </Button>
          )}
          <Button
            onClick={() => handleCreate()}
            disabled={!canCreate}
            className="inline-flex items-center gap-1"
          >
            <span>Create</span>
            {(addProject.isPending || busy) && (
              <LoaderCircle className="size-[1em] animate-spin" />
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}