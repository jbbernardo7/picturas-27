import { useCallback, useRef, useState } from "react";
import {
  UploadCancelled,
  uploadErrorMessage,
  uploadVideo,
  type UploadedVideo,
} from "./video-upload";

// UC-VID-001 step 4: In queue, Processing, Done, Fail.
export type VideoUploadStatus = "queued" | "processing" | "done" | "fail";

export const STATUS_LABEL: Record<VideoUploadStatus, string> = {
  queued: "In queue",
  processing: "Processing",
  done: "Done",
  fail: "Fail",
};

export interface VideoUploadItem {
  id: string;
  file: File;
  status: VideoUploadStatus;
  percent: number;
  error?: string;
}

export interface VideoUploadSummary {
  done: number;
  failed: number;
  videos: UploadedVideo[];
  /** Highest project version returned by the server, if any. */
  version?: number;
}

// Progress events fire many times a second; a few updates per second are enough (>= 1/s).
const PROGRESS_EVERY_MS = 250;

let nextId = 0;

/**
 * Uploads several videos to one project at the same time (RN10). Each file has its
 * own status, progress and cancel; a failure never stops the others (RN4).
 */
export function useVideoUploadQueue() {
  const [items, setItems] = useState<VideoUploadItem[]>([]);
  const [running, setRunning] = useState(false);
  const controllers = useRef(new Map<string, AbortController>());

  const update = useCallback((id: string, patch: Partial<VideoUploadItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }, []);

  const run = useCallback(
    async ({
      files,
      uid,
      pid,
      token,
      onUploaded,
    }: {
      files: File[];
      uid: string;
      pid: string;
      token: string;
      onUploaded?: (video: UploadedVideo, version?: number) => void;
    }): Promise<VideoUploadSummary> => {
      const queued: VideoUploadItem[] = files.map((file) => ({
        id: `v${nextId++}`,
        file,
        status: "queued",
        percent: 0,
      }));
      setItems(queued);
      setRunning(true);
      for (const item of queued) controllers.current.set(item.id, new AbortController());

      const summary: VideoUploadSummary = { done: 0, failed: 0, videos: [] };

      await Promise.allSettled(
        queued.map(async (item) => {
          const controller = controllers.current.get(item.id)!;
          let lastReport = 0;
          update(item.id, { status: "processing" });
          try {
            const { video, version } = await uploadVideo({
              uid,
              pid,
              token,
              file: item.file,
              signal: controller.signal,
              onProgress: (p) => {
                const now = Date.now();
                if (p.phase === "uploading" && now - lastReport < PROGRESS_EVERY_MS) return;
                lastReport = now;
                const percent = p.total > 0 ? Math.min(100, Math.round((p.loaded * 100) / p.total)) : 0;
                update(item.id, { percent });
              },
            });
            const v = Number(version);
            if (Number.isFinite(v)) summary.version = Math.max(summary.version ?? v, v);
            summary.done++;
            summary.videos.push(video);
            update(item.id, { status: "done", percent: 100 });
            onUploaded?.(video, Number.isFinite(v) ? v : undefined);
          } catch (err) {
            summary.failed++;
            update(item.id, {
              status: "fail",
              error: err instanceof UploadCancelled ? "Upload cancelled." : uploadErrorMessage(err),
            });
            throw err;
          } finally {
            controllers.current.delete(item.id);
          }
        }),
      );

      setRunning(false);
      return summary;
    },
    [update],
  );

  /** FA3: cancel one file; the others keep going. */
  const cancel = useCallback((id: string) => controllers.current.get(id)?.abort(), []);

  const cancelAll = useCallback(() => {
    controllers.current.forEach((c) => c.abort());
  }, []);

  const clear = useCallback(() => setItems([]), []);

  return { items, running, run, cancel, cancelAll, clear };
}
