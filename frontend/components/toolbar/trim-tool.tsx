import { ToolbarButton } from "./toolbar-button";
import { Scissors } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { getVideoDuration } from "@/lib/utils";
import {
  useCurrentImage,
  useProjectInfo,
  useUnsavedChanges,
} from "@/providers/project-provider";
import { TrimToolParams } from "@/lib/tool-types";

const round2 = (n: number) => Math.round(n * 100) / 100;

export default function TrimTool({ disabled }: { disabled: boolean }) {
  const project = useProjectInfo();
  const currentVideo = useCurrentImage();
  const { setHasUnsavedChanges } = useUnsavedChanges();

  const [duration, setDuration] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const [open, setOpen] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!currentVideo) return;
    getVideoDuration(currentVideo.url)
      .then((d) => setDuration(Math.floor(d * 100) / 100))
      .catch(() => setDuration(0));
  }, [currentVideo]);

  useEffect(() => {
    const trim = project.tools?.find((t) => t.procedure === "trim");
    if (trim) {
      setStartTime((trim.params as TrimToolParams).startTime);
      setEndTime((trim.params as TrimToolParams).endTime);
    } else {
      setStartTime(0);
      setEndTime(duration);
    }
  }, [project.tools, duration]);

  const invalid =
    startTime < 0 || startTime >= endTime || (duration > 0 && endTime > duration);

  const playInterval = () => {
    const v = videoRef.current;
    if (!v || invalid) return;
    v.currentTime = startTime;
    v.play();
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
      tool={{ procedure: "trim", params: { startTime, endTime } }}
      onDefault={() => {
        setStartTime(0);
        setEndTime(duration);
        setHasUnsavedChanges(false);
      }}
      isDefault={invalid || (startTime === 0 && endTime === duration)}
      disabled={disabled}
      icon={Scissors}
      label="Trim video"
    >
      <div className="space-y-2">
        {currentVideo && (
          <video
            ref={videoRef}
            src={currentVideo.url}
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
        {duration > 0 && <p className="text-xs text-gray-500">Duration: {duration}s</p>}
        {invalid && (
          <p className="text-xs text-red-500">
            Start must be lower than end and inside the video duration.
          </p>
        )}
      </div>
    </ToolbarButton>
  );
}