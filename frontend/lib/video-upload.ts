import axios from "axios";
import { api } from "./axios";

// Keep in sync with the backend (VIDEO_TYPES in uploadVideo.js and MAX_VIDEO_SIZE_MB in docker-compose).
export const VIDEO_MIME_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
export const MAX_VIDEO_BYTES = 2000 * 1024 * 1024;

const PARALLEL_PARTS = 3; // pieces uploaded at the same time
const MAX_ATTEMPTS = 3; // tries per piece before giving up

export type UploadPhase = "uploading" | "finishing";

export interface UploadProgress {
  phase: UploadPhase;
  loaded: number; // bytes sent so far
  total: number; // file size in bytes
}

export interface UploadedVideo {
  _id: string;
  name: string;
  size: number;
  contentType: string;
  status: string;
}

export class UploadCancelled extends Error {
  constructor() {
    super("Upload cancelled");
    this.name = "UploadCancelled";
  }
}

/** Instant check in the browser. Returns an error message, or null if the file is fine. */
export function validateVideoFile(file: File): string | null {
  if (!VIDEO_MIME_TYPES.includes(file.type)) {
    return "Unsupported video type. Use MP4, WebM or MOV.";
  }
  if (file.size <= 0) return "The file is empty.";
  if (file.size > MAX_VIDEO_BYTES) {
    return `The video is too large (max ${Math.round(MAX_VIDEO_BYTES / 1024 / 1024)} MB).`;
  }
  return null;
}

/** Turns an upload error into something to show in a toast. */
export function describeUploadError(error: unknown): { title: string; description: string } {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 415) return { title: "Unsupported video type", description: "Use MP4, WebM or MOV." };
    if (status === 413) return { title: "Video too large", description: "The file is above the maximum size." };
    if (status === 409) return { title: "Can't add the video", description: "This project already has a video." };
    if (status === 400) return { title: "Can't upload here", description: "This is not a video project." };
    if (status === 401 || status === 403) return { title: "Not allowed", description: "Only the project owner can upload videos." };
  }
  return {
    title: "Video upload failed",
    description: error instanceof Error ? error.message : "Something went wrong. Please try again.",
  };
}

// Sends one piece with XMLHttpRequest, because fetch can't report upload progress.
function putPart(
  url: string,
  blob: Blob,
  onBytes: (loaded: number) => void,
  signal: AbortSignal,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onBytes(e.loaded);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const etag = xhr.getResponseHeader("ETag");
        if (etag) resolve(etag);
        else reject(new Error("Storage did not return an ETag for a piece."));
      } else {
        reject(new Error(`A piece failed to upload (status ${xhr.status}).`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error while uploading a piece."));
    xhr.onabort = () => reject(new UploadCancelled());

    const onAbort = () => xhr.abort();
    signal.addEventListener("abort", onAbort, { once: true });
    xhr.onloadend = () => signal.removeEventListener("abort", onAbort);

    xhr.send(blob);
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Uploads a video: init -> sign + PUT each piece -> complete.
 * Pass an AbortSignal to cancel; the stored pieces are freed with /video/abort.
 * Resolves with the new video and the project's new version (X-Project-Version header).
 */
export async function uploadVideo({
  uid,
  pid,
  token,
  file,
  onProgress,
  signal,
}: {
  uid: string;
  pid: string;
  token: string;
  file: File;
  onProgress?: (p: UploadProgress) => void;
  signal?: AbortSignal;
}): Promise<{ video: UploadedVideo; version?: string }> {
  const problem = validateVideoFile(file);
  if (problem) throw new Error(problem);

  const base = `/projects/${uid}/${pid}/video`;
  const headers = { Authorization: `Bearer ${token}` };

  // One controller stops every worker when something fails or the user cancels.
  const internal = new AbortController();
  if (signal) {
    if (signal.aborted) throw new UploadCancelled();
    signal.addEventListener("abort", () => internal.abort(), { once: true });
  }

  const init = await api.post<{
    bucket: string;
    key: string;
    uploadId: string;
    partSize: number;
  }>(base + "/init", { contentType: file.type, size: file.size }, { headers });

  const { bucket, key, uploadId, partSize } = init.data;
  const partCount = Math.ceil(file.size / partSize);
  const parts: { PartNumber: number; ETag: string }[] = new Array(partCount);
  const sentPerPart: number[] = new Array(partCount).fill(0);

  const report = () => {
    const loaded = sentPerPart.reduce((a, b) => a + b, 0);
    onProgress?.({ phase: "uploading", loaded: Math.min(loaded, file.size), total: file.size });
  };

  async function uploadPiece(index: number): Promise<string> {
    const start = index * partSize;
    const blob = file.slice(start, Math.min(file.size, start + partSize));

    for (let attempt = 1; ; attempt++) {
      try {
        // Fresh link each try, in case the previous one was the problem.
        const s = await api.post<{ url: string }>(
          base + "/sign",
          { bucket, key, uploadId, partNumber: index + 1 },
          { headers },
        );
        const etag = await putPart(
          s.data.url,
          blob,
          (n) => {
            sentPerPart[index] = n;
            report();
          },
          internal.signal,
        );
        sentPerPart[index] = blob.size;
        report();
        return etag;
      } catch (err) {
        sentPerPart[index] = 0;
        if (err instanceof UploadCancelled || internal.signal.aborted) throw new UploadCancelled();
        if (attempt >= MAX_ATTEMPTS) throw err;
        await sleep(500 * attempt);
      }
    }
  }

  let next = 0;
  async function worker() {
    while (true) {
      if (internal.signal.aborted) throw new UploadCancelled();
      const index = next++;
      if (index >= partCount) return;
      parts[index] = { PartNumber: index + 1, ETag: await uploadPiece(index) };
    }
  }

  try {
    report();
    await Promise.all(
      Array.from({ length: Math.min(PARALLEL_PARTS, partCount) }, () =>
        worker().catch((err) => {
          internal.abort(); // stop the other workers
          throw err;
        }),
      ),
    );

    onProgress?.({ phase: "finishing", loaded: file.size, total: file.size });

    const done = await api.post<UploadedVideo>(
      base + "/complete",
      { bucket, key, uploadId, parts, name: file.name },
      { headers },
    );

    return { video: done.data, version: done.headers?.["x-project-version"] };
  } catch (err) {
    // Free the pieces already stored. Best effort: ignore errors here.
    try {
      await api.post(base + "/abort", { bucket, key, uploadId }, { headers });
    } catch {}
    throw err;
  }
}