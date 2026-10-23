import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAddProject } from "@/lib/mutations/projects";
import ImageSubmissionArea from "../image-submission-area";
import { useSession } from "@/providers/session-provider";
import { AlertTriangle, FileVideo, ImageIcon, LoaderCircle, Upload, Video, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/error-messages";
import { deleteProject, type ProjectType } from "@/lib/projects";
import { isImageFile, UPLOAD_MESSAGES } from "@/lib/video-upload";
import { sortVideoDrop } from "@/lib/video-drop";
import { useVideoUploadQueue } from "@/lib/use-video-upload-queue";
import { formatSize, VideoUploadList } from "../video-upload-list";

type Phase = "edit" | "uploading" | "finished";

const TYPE_LABEL: Record<ProjectType, string> = { image: "Images", video: "Video" };

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
  const [type, setType] = useState<ProjectType>("image"); // RN8: Image by default
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [receivedImages, setReceivedImages] = useState<File[]>([]);
  const [imageAreaKey, setImageAreaKey] = useState(0);

  // video project state
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [videoErrors, setVideoErrors] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [reading, setReading] = useState(false); // extracting a zip
  const [phase, setPhase] = useState<Phase>("edit");
  const [mismatch, setMismatch] = useState<File[] | null>(null); // E7 warning
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [noneUploaded, setNoneUploaded] = useState(false); // E6
  const inputRef = useRef<HTMLInputElement>(null);

  const session = useSession();
  const addProject = useAddProject(session.user._id, session.token);
  const queue = useVideoUploadQueue();
  const isAnonymous = session.user.type === "anonymous";
  const busy = phase === "uploading";

  const canCreate =
    name !== "" &&
    phase === "edit" &&
    !reading &&
    !addProject.isPending &&
    !(type === "video" && isAnonymous) &&
    imageFiles.length + videoFiles.length > 0;

  /** Adds dropped files to the video list. Images are kept as images (E7 is checked on Create). */
  async function addVideoDrop(list: File[]) {
    if (list.length === 0) return;
    setReading(true);
    try {
      const { videos, images, errors } = await sortVideoDrop(list);
      setVideoErrors(errors);
      if (videos.length > 0) setVideoFiles((prev) => [...prev, ...videos]);
      if (images.length > 0) {
        const merged = [...imageFiles, ...images];
        setReceivedImages(merged);
        setImageFiles(merged);
      }
    } finally {
      setReading(false);
    }
  }

  function resetImages() {
    setImageFiles([]);
    setReceivedImages([]);
    setImageAreaKey((k) => k + 1); // remount to clear its own list
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
    const uid = session.user._id;
    const token = session.token;
    setPhase("uploading");
    setNoneUploaded(false);

    // 1) create the project; it stays hidden until a video is stored (RN6)
    let project;
    try {
      project = await addProject.mutateAsync({ uid, token, name, type: "video", images: [] });
    } catch (error) {
      const { title, description } = getErrorMessage("project-create", error);
      toast({ title, description, variant: "destructive" });
      setPhase("edit");
      return;
    }

    // 2) upload every video at the same time (RN10)
    const summary = await queue.run({ files: videoFiles, uid, pid: project._id, token });
    qc.invalidateQueries({ queryKey: ["projects", uid, token], refetchType: "all" });

    // 3) nothing stored: don't keep the project (E6)
    if (summary.done === 0) {
      try {
        await deleteProject({ uid, pid: project._id, token, projectVersion: project.version });
      } catch {
        // still hidden (pending), and removed later by the server
      }
      setNoneUploaded(true);
      setPhase("finished");
      return;
    }

    // 4) open the project; if some files failed, show their status first
    if (summary.failed === 0) {
      toast({
        title: "Projeto criado com sucesso",
        description:
          summary.done === 1
            ? "O vídeo foi adicionado ao novo projeto."
            : `${summary.done} vídeos foram adicionados ao novo projeto.`,
      });
      setOpen(false);
      router.push(`/dashboard/${project._id}`);
      return;
    }
    setCreatedId(project._id);
    setPhase("finished");
  }

  function handleCreate() {
    // E7: warn before creating when the files don't all match the chosen type
    const mismatched = type === "video" ? imageFiles : videoFiles;
    if (mismatched.length > 0) {
      setMismatch(mismatched);
      return;
    }
    if (type === "video") void handleCreateVideo();
    else handleCreateImages();
  }

  // Files dropped on the library (FA1): sort them, then open the dialog.
  useEffect(() => {
    if (files.length === 0) return;
    const images = files.filter(isImageFile);
    const others = files.filter((f) => !isImageFile(f));
    setReceivedImages(images);
    setImageFiles(images);
    if (others.length > 0) void addVideoDrop(others);
    setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  // Reset everything when the dialog closes.
  useEffect(() => {
    if (open) return;
    setName("");
    setImageFiles([]);
    setReceivedImages([]);
    setType("image");
    setVideoFiles([]);
    setVideoErrors([]);
    setMismatch(null);
    setCreatedId(null);
    setNoneUploaded(false);
    setPhase("edit");
    queue.clear();
    if (setFiles) setFiles([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, setFiles]);

  // warn before leaving the page while videos are uploading
  useEffect(() => {
    if (!busy) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  const otherType: ProjectType = type === "video" ? "image" : "video";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // can't close while uploading, cancel the uploads instead
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
          {(["image", "video"] as const).map((t) => (
            <Button
              key={t}
              type="button"
              variant={type === t ? "default" : "outline"}
              onClick={() => {
                setType(t);
                setMismatch(null);
              }}
              disabled={phase !== "edit"}
              className="inline-flex items-center gap-2"
            >
              {t === "image" ? <ImageIcon className="size-4" /> : <Video className="size-4" />}
              {TYPE_LABEL[t]}
            </Button>
          ))}
        </div>

        <Label htmlFor="project-name">Project Name</Label>
        <Input
          id="project-name"
          placeholder="Enter project name"
          value={name}
          disabled={phase !== "edit"}
          onChange={(e) => setName(e.target.value)}
        />

        {/* Hidden (not unmounted) for video projects, so dropped images aren't lost
            if the user switches the type back and forth. */}
        <div className={type === "image" ? "" : "hidden"}>
          <ImageSubmissionArea
            key={imageAreaKey}
            onDrop={(files) => setImageFiles(files)}
            receivedFiles={receivedImages}
          />
          {videoFiles.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {videoFiles.length} video file(s) also selected.
            </p>
          )}
        </div>

        {type === "video" && isAnonymous && (
          <p className="text-sm text-destructive">{UPLOAD_MESSAGES.profile}</p>
        )}

        {type === "video" && !isAnonymous && (
          <div className="flex flex-col gap-2">
            {phase === "edit" && (
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
                  if (!reading) void addVideoDrop(Array.from(e.dataTransfer.files));
                }}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-6 text-center cursor-pointer transition-colors",
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
            )}

            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.zip,application/zip"
              onChange={(e) => {
                void addVideoDrop(Array.from(e.target.files ?? []));
                e.target.value = ""; // allow choosing the same file again
              }}
            />

            {videoErrors.length > 0 && phase === "edit" && (
              <ul className="text-sm text-destructive">
                {videoErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            )}

            {phase === "edit" && videoFiles.length > 0 && (
              <div className="flex max-h-48 flex-col gap-2 overflow-y-auto">
                {videoFiles.map((file, i) => (
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
                      onClick={() => setVideoFiles((prev) => prev.filter((_, j) => j !== i))}
                      title="Remove video"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {phase !== "edit" && <VideoUploadList items={queue.items} onCancel={queue.cancel} />}

            {phase === "uploading" && queue.items.length === 0 && (
              <p className="text-xs text-muted-foreground">Creating project...</p>
            )}
            {noneUploaded && <p className="text-sm text-destructive">{UPLOAD_MESSAGES.none}</p>}
            {createdId && (
              <p className="text-sm text-muted-foreground">
                The project was created with the videos marked Done.
              </p>
            )}
          </div>
        )}

        {mismatch && (
          <div className="flex flex-col gap-2 rounded-md border border-destructive/50 p-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="size-4 text-destructive" />
              Some files don&apos;t match a {TYPE_LABEL[type]} project
            </p>
            <p className="text-xs text-muted-foreground">
              {mismatch
                .slice(0, 5)
                .map((f) => f.name)
                .join(", ")}
              {mismatch.length > 5 ? ` and ${mismatch.length - 5} more` : ""}. Change the
              project type, remove these files, or cancel. No project was created.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setType(otherType);
                  setMismatch(null);
                }}
              >
                Change to {TYPE_LABEL[otherType]}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (type === "video") resetImages();
                  else setVideoFiles([]);
                  setMismatch(null);
                }}
              >
                Remove these files
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setMismatch(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          {busy && type === "video" && (
            <Button type="button" variant="outline" onClick={queue.cancelAll}>
              Cancel all
            </Button>
          )}
          {phase === "finished" ? (
            createdId ? (
              <Button
                onClick={() => {
                  setOpen(false);
                  router.push(`/dashboard/${createdId}`);
                }}
              >
                Open project
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => {
                  queue.clear();
                  setNoneUploaded(false);
                  setPhase("edit");
                }}
              >
                Back
              </Button>
            )
          ) : (
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
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
