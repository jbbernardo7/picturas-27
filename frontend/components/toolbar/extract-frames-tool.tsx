import { ToolbarButton } from "./toolbar-button";
import { Images } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { getVideoDuration } from "@/lib/utils";
import {
  useCurrentVideo,
  useProjectInfo,
  useUnsavedChanges,
} from "@/providers/project-provider";
import { useSession } from "@/providers/session-provider";
import { useGetProjects } from "@/lib/queries/projects";
import type { ProjectToolResponse } from "@/lib/projects";
import {
  MAX_FRAMES,
  type ExtractFramesToolParams,
  type FrameDestination,
  type TrimToolParams,
} from "@/lib/tool-types";

const round2 = (n: number) => Math.round(n * 100) / 100;

// Same messages as the projects service (E3 / E4 / FA4).
function paramsProblem(start: number, end: number, count: number, duration: number, max: number) {
  if (!Number.isFinite(start) || !Number.isFinite(end)) return "Start and end times must be numbers.";
  if (start < 0 || start >= end) return "Start time must be lower than end time.";
  if (duration > 0 && end > duration + 0.01) {
    return `The interval must be inside the video duration (${duration}s).`;
  }
  if (!Number.isInteger(count) || count < 1) return "The number of frames must be a whole number of at least 1.";
  if (count > max) return `Your profile allows up to ${max} frames per extraction.`;
  return null;
}

/**
 * UC-VID-003: extracts evenly spaced frames from the video open in the player.
 * Always the last step of the video's chain; the frames go to an image project.
 */
export default function ExtractFramesTool({ disabled }: { disabled: boolean }) {
  const project = useProjectInfo();
  const video = useCurrentVideo();
  const videoId = video?._id ?? "";
  const session = useSession();
  const isAnonymous = session.user.type === "anonymous";
  const maxFrames = MAX_FRAMES[session.user.type] ?? 0;
  const { setHasUnsavedChanges } = useUnsavedChanges();

  const [rawDuration, setRawDuration] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const [count, setCount] = useState<number>(5);
  const [format, setFormat] = useState<"png" | "jpeg">("png");
  const [open, setOpen] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // destination dialog
  const [askOpen, setAskOpen] = useState(false);
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [newName, setNewName] = useState("");
  const [destId, setDestId] = useState("");
  const saveRef = useRef<((extra?: Record<string, unknown>) => void) | null>(null);

  const projects = useGetProjects(session.user._id, session.token);
  const imageProjects = useMemo(
    () => (projects.data ?? []).filter((p) => (p.type ?? "image") === "image"),
    [projects.data],
  );

  const matchTool = useCallback(
    (t: ProjectToolResponse) =>
      t.procedure === "extract_frames" &&
      (t.params as Partial<ExtractFramesToolParams>)?.videoId === videoId,
    [videoId],
  );

  // A trim of the same video runs first: times are on the trimmed video.
  const trim = project.tools.find(
    (t) => t.procedure === "trim" && (t.params as Partial<TrimToolParams>)?.videoId === videoId,
  )?.params as TrimToolParams | undefined;
  const offset = trim?.startTime ?? 0;
  const duration = trim ? round2(trim.endTime - trim.startTime) : rawDuration;

  useEffect(() => {
    if (!video) {
      setRawDuration(0);
      return;
    }
    if (video.duration && video.duration > 0) {
      setRawDuration(Math.floor(video.duration * 100) / 100);
      return;
    }
    let cancelled = false;
    getVideoDuration(video.url)
      .then((d) => !cancelled && setRawDuration(Math.floor(d * 100) / 100))
      .catch(() => !cancelled && setRawDuration(0));
    return () => {
      cancelled = true;
    };
  }, [video]);

  // Saved values of this video's extraction, or the defaults.
  useEffect(() => {
    const saved = project.tools.find(matchTool)?.params as ExtractFramesToolParams | undefined;
    if (saved) {
      setStartTime(saved.startTime);
      setEndTime(saved.endTime);
      setCount(saved.count);
      setFormat(saved.format);
      if (saved.destination?.mode === "existing") {
        setMode("existing");
        setDestId(saved.destination.projectId);
      } else if (saved.destination?.mode === "new") {
        setMode("new");
        setNewName(saved.destination.name);
      }
    } else {
      setStartTime(0);
      setEndTime(duration);
      setCount(Math.min(5, maxFrames || 5));
      setFormat("png");
      setMode("new");
      setDestId("");
    }
  }, [project.tools, matchTool, duration, open, maxFrames]);

  useEffect(() => {
    if (video && !newName) setNewName(`${video.name.replace(/\.[^.]+$/, "")} – frames`);
  }, [video, newName]);

  const problem = paramsProblem(startTime, endTime, count, duration, maxFrames);
  const invalid = problem !== null;
  const length = round2(endTime - startTime);
  const spacing = count > 1 && !invalid ? round2(length / count) : null;

  // The player shows the original video; with a trim, map its time to the trimmed one.
  const setFromCurrentTime = (which: "start" | "end") => {
    const v = videoRef.current;
    if (!v) return;
    const t = Math.max(0, round2(v.currentTime - offset));
    if (which === "start") setStartTime(t);
    else setEndTime(t);
    setHasUnsavedChanges(true);
  };

  const playInterval = () => {
    const v = videoRef.current;
    if (!v || invalid) return;
    v.currentTime = startTime + offset;
    void v.play();
  };

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (v && !v.paused && v.currentTime >= endTime + offset) v.pause();
  };

  const destinationOk = mode === "new" ? newName.trim().length > 0 : destId !== "";

  const confirmDestination = () => {
    const destination: FrameDestination =
      mode === "new" ? { mode: "new", name: newName.trim() } : { mode: "existing", projectId: destId };
    setAskOpen(false);
    saveRef.current?.({ destination });
  };

  return (
    <>
      <ToolbarButton
        open={open}
        setOpen={setOpen}
        noPreview
        tool={{
          procedure: "extract_frames",
          params: { videoId, startTime, endTime, count, format },
        }}
        matchTool={matchTool}
        onDefault={() => {
          setStartTime(0);
          setEndTime(duration);
          setCount(Math.min(5, maxFrames || 5));
          setFormat("png");
          setHasUnsavedChanges(false);
        }}
        onBeforeSave={(save) => {
          saveRef.current = save;
          setAskOpen(true);
        }}
        isDefault={invalid}
        disabled={disabled || !video || isAnonymous}
        icon={Images}
        label={isAnonymous ? "Extract frames (registered users only)" : "Extract frames"}
      >
        <div className="space-y-2">
          {video && (
            <video
              key={video._id}
              ref={videoRef}
              src={video.url}
              controls
              preload="metadata"
              onTimeUpdate={onTimeUpdate}
              className="w-full rounded-md max-h-32 bg-black"
            />
          )}
          {trim && (
            <p className="text-xs text-amber-600">
              Times are relative to the trimmed video ({trim.startTime}s–{trim.endTime}s).
            </p>
          )}
          <div className="flex gap-1">
            <Button variant="outline" className="h-6 text-xs flex-1"
              onClick={() => setFromCurrentTime("start")}>Set start</Button>
            <Button variant="outline" className="h-6 text-xs flex-1"
              onClick={() => setFromCurrentTime("end")}>Set end</Button>
            <Button variant="outline" className="h-6 text-xs flex-1"
              onClick={playInterval} disabled={invalid}>Play</Button>
          </div>
          <div className="flex w-full justify-between items-center text-sm text-gray-500">
            <Label htmlFor="frStart">Start</Label>
            <div className="flex items-center space-x-2 w-1/2">
              <Input id="frStart" type="number" min={0} step={0.1} value={startTime}
                onChange={(e) => { setStartTime(Number(e.target.value)); setHasUnsavedChanges(true); }} />
              <span>s</span>
            </div>
          </div>
          <div className="flex w-full justify-between items-center text-sm text-gray-500">
            <Label htmlFor="frEnd">End</Label>
            <div className="flex items-center space-x-2 w-1/2">
              <Input id="frEnd" type="number" min={0} max={duration || undefined} step={0.1} value={endTime}
                onChange={(e) => { setEndTime(Number(e.target.value)); setHasUnsavedChanges(true); }} />
              <span>s</span>
            </div>
          </div>
          <div className="flex w-full justify-between items-center text-sm text-gray-500">
            <Label htmlFor="frCount">Frames</Label>
            <div className="flex items-center space-x-2 w-1/2">
              <Input id="frCount" type="number" min={1} max={maxFrames} step={1} value={count}
                onChange={(e) => { setCount(Number(e.target.value)); setHasUnsavedChanges(true); }} />
            </div>
          </div>
          <div className="flex w-full gap-1">
            {(["png", "jpeg"] as const).map((f) => (
              <Button key={f} type="button" variant={format === f ? "default" : "outline"}
                className="h-6 flex-1 text-xs"
                onClick={() => { setFormat(f); setHasUnsavedChanges(true); }}>
                {f.toUpperCase()}
              </Button>
            ))}
          </div>
          {!invalid && (
            <p className="text-xs text-gray-500">
              {startTime}s–{endTime}s ({length}s) · {count} frame{count === 1 ? "" : "s"}
              {spacing !== null && ` every ${spacing}s`} · {format.toUpperCase()}
            </p>
          )}
          {problem && <p className="text-xs text-red-500">{problem}</p>}
          <p className="text-xs text-gray-400">
            Last step for this video: no tool can be added after it. Up to {maxFrames} frames.
          </p>
        </div>
      </ToolbarButton>

      <Dialog open={askOpen} onOpenChange={setAskOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Where should the frames go?</DialogTitle>
            <DialogDescription>
              A video project can only hold videos, so the frames are saved as images in an
              image project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" checked={mode === "new"} onChange={() => setMode("new")} />
              Create a new project
            </label>
            {mode === "new" && (
              <Input value={newName} maxLength={100} onChange={(e) => setNewName(e.target.value)}
                placeholder="Project name" />
            )}
            <label className="flex items-center gap-2">
              <input type="radio" checked={mode === "existing"} disabled={imageProjects.length === 0}
                onChange={() => setMode("existing")} />
              Add to an existing image project
              {imageProjects.length === 0 && <span className="text-gray-400">(you have none)</span>}
            </label>
            {mode === "existing" && (
              <select className="w-full rounded-md border bg-background p-2"
                value={destId} onChange={(e) => setDestId(e.target.value)}>
                <option value="">Choose a project…</option>
                {imageProjects.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAskOpen(false)}>Cancel</Button>
            <Button disabled={!destinationOk} onClick={confirmDestination}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
