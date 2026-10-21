import { ToolbarButton } from "./toolbar-button";
import { Scissors } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { getVideoDuration } from "@/lib/utils";
import {
  useCurrentVideo,
  useProjectInfo,
  useUnsavedChanges,
} from "@/providers/project-provider";
import { useSession } from "@/providers/session-provider";
import type { ProjectToolResponse } from "@/lib/projects";
import type { TrimToolParams } from "@/lib/tool-types";

const round2 = (n: number) => Math.round(n * 100) / 100;

// UC-VID-002 FA1 messages (same text as the projects service).
function rangeProblem(start: number, end: number, duration: number): string | null {
  if (!Number.isFinite(start) || !Number.isFinite(end)) return "Start and end times must be numbers.";
  if (start < 0 || start >= end) return "Start time must be lower than end time."; // RN1
  if (duration > 0 && end > duration) {
    return `The interval must be inside the video duration (${duration}s).`; // RN2
  }
  return null;
}

/** UC-VID-002: trims the video open in the player to [start, end] seconds. */
export default function TrimTool({ disabled }: { disabled: boolean }) {
  const project = useProjectInfo();
  const video = useCurrentVideo();
  const videoId = video?._id ?? "";
  const session = useSession();
  const isAnonymous = session.user.type === "anonymous";
  const { setHasUnsavedChanges } = useUnsavedChanges();

  const [duration, setDuration] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const [open, setOpen] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const matchTool = useCallback(
    (t: ProjectToolResponse) =>
      t.procedure === "trim" && (t.params as Partial<TrimToolParams>)?.videoId === videoId,
    [videoId],
  );

  // Duration measured on upload; older videos fall back to the browser's metadata.
  useEffect(() => {
    if (!video) {
      setDuration(0);
      return;
    }
    if (video.duration && video.duration > 0) {
      setDuration(Math.floor(video.duration * 100) / 100);
      return;
    }
    let cancelled = false;
    getVideoDuration(video.url)
      .then((d) => !cancelled && setDuration(Math.floor(d * 100) / 100))
      .catch(() => !cancelled && setDuration(0));
    return () => {
      cancelled = true;
    };
  }, [video]);

  // Saved interval of this video, or the whole video.
  useEffect(() => {
    const trim = project.tools.find(matchTool);
    if (trim) {
      setStartTime((trim.params as TrimToolParams).startTime);
      setEndTime((trim.params as TrimToolParams).endTime);
    } else {
      setStartTime(0);
      setEndTime(duration);
    }
  }, [project.tools, matchTool, duration, open]);

  const problem = rangeProblem(startTime, endTime, duration);
  const invalid = problem !== null;

  const playInterval = () => {
    const v = videoRef.current;
    if (!v || invalid) return;
    v.currentTime = startTime;
    void v.play();
  };

  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (v && !v.paused && v.currentTime >= endTime) v.pause();
  };

  const setFromCurrentTime = (which: "start" | "end") => {
    const v = videoRef.current;
    if (!v) return;
    const t = round2(v.currentTime);
    if (which === "start") setStartTime(t);
    else setEndTime(t);
    setHasUnsavedChanges(true);
  };

  return (
    <ToolbarButton
      open={open}
      setOpen={setOpen}
      noPreview
      tool={{ procedure: "trim", params: { videoId, startTime, endTime } }}
      matchTool={matchTool}
      onDefault={() => {
        setStartTime(0);
        setEndTime(duration);
        setHasUnsavedChanges(false);
      }}
      // Save stays off while the interval is invalid or still the whole video.
      isDefault={invalid || (startTime === 0 && endTime === duration)}
      disabled={disabled || !video || isAnonymous}
      icon={Scissors}
      label={isAnonymous ? "Trim video (registered users only)" : "Trim video"}
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
        <div className="flex gap-1">
          <Button variant="outline" className="h-6 text-xs flex-1"
            onClick={() => setFromCurrentTime("start")}>Set start</Button>
          <Button variant="outline" className="h-6 text-xs flex-1"
            onClick={() => setFromCurrentTime("end")}>Set end</Button>
          <Button variant="outline" className="h-6 text-xs flex-1"
            onClick={playInterval} disabled={invalid}>Play</Button>
        </div>
        <div className="flex w-full justify-between items-center text-sm text-gray-500">
          <Label htmlFor="startTime">Start</Label>
          <div className="flex items-center space-x-2 w-1/2">
            <Input id="startTime" type="number" min={0} step={0.1} value={startTime}
              onChange={(e) => { setStartTime(Number(e.target.value)); setHasUnsavedChanges(true); }} />
            <span>s</span>
          </div>
        </div>
        <div className="flex w-full justify-between items-center text-sm text-gray-500">
          <Label htmlFor="endTime">End</Label>
          <div className="flex items-center space-x-2 w-1/2">
            <Input id="endTime" type="number" min={0} max={duration || undefined} step={0.1} value={endTime}
              onChange={(e) => { setEndTime(Number(e.target.value)); setHasUnsavedChanges(true); }} />
            <span>s</span>
          </div>
        </div>
        {duration > 0 && (
          <p className="text-xs text-gray-500">
            Duration: {duration}s
            {!invalid && ` · result: ${round2(endTime - startTime)}s`}
          </p>
        )}
        {problem && <p className="text-xs text-red-500">{problem}</p>}
        {video && (
          <p className="truncate text-xs text-gray-400" title={video.name}>
            Applies to {video.name}
          </p>
        )}
      </div>
    </ToolbarButton>
  );
}
