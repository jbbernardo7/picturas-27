import axios from "axios";
import JSZip from "jszip";
import { api } from "./axios";

// Keep in sync with the backend (VIDEO_TYPES in uploadVideo.js and MAX_VIDEO_SIZE_MB in docker-compose).
export const VIDEO_MIME_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
export const MAX_VIDEO_MB = 500;
export const MAX_VIDEO_BYTES = MAX_VIDEO_MB * 1024 * 1024;

const VIDEO_EXT_TO_MIME: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
};
const IMAGE_EXT = /\.(png|jpe?g)$/i;

// Error messages from UC-VID-001.
export const UPLOAD_MESSAGES = {
  profile: "Only premium/registered users can upload videos!", // E1
  type: "Invalid file type! Accepted formats: MP4, WEBM, MOV.", // E2
  size: `File exceeds the maximum allowed size (${MAX_VIDEO_MB} MB).`, // E3
  failed: "Failed upload.", // E5
  none: "No files were uploaded.", // E6
  projectType: "Invalid project type", // E7 (existing project)
  content: "Invalid file content!", // E8
};

const PARALLEL_PARTS = 3; // pieces of one file uploaded at the same time
const HEARTBEAT_MS = 10 * 1000; // tells storage the upload is still alive

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

/** MIME type of a supported video, from the browser type or the extension; null otherwise. */
export function videoMimeType(file: File): string | null {
  if (VIDEO_MIME_TYPES.includes(file.type)) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return VIDEO_EXT_TO_MIME[ext] ?? null;
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/") || IMAGE_EXT.test(file.name);
}

export function isZipFile(file: File): boolean {
  return (
    file.type === "application/zip" ||
    file.type === "application/x-zip-compressed" ||
    file.name.toLowerCase().endsWith(".zip")
  );
}

/** Instant check in the browser (E2, E3). Returns an error message, or null if the file is fine. */
export function validateVideoFile(file: File): string | null {
  if (!videoMimeType(file)) return UPLOAD_MESSAGES.type;
  if (file.size <= 0) return UPLOAD_MESSAGES.content;
  if (file.size > MAX_VIDEO_BYTES) return UPLOAD_MESSAGES.size;
  return null;
}

/** The UC message for an upload error: the server's own message when it sent one. */
export function uploadErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && error.response) {
    const data = error.response.data;
    const msg = typeof data === "string" ? data : data?.error ?? data?.message;
    if (typeof msg === "string" && msg) return msg;
    if (error.response.status === 413) return UPLOAD_MESSAGES.size;
    if (error.response.status === 415) return UPLOAD_MESSAGES.type;
  }
  return UPLOAD_MESSAGES.failed;
}

/** Turns an upload error into something to show in a toast. */
export function describeUploadError(error: unknown): { title: string; description: string } {
  return { title: "Video upload failed", description: uploadErrorMessage(error) };
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
  const contentType = videoMimeType(file)!;

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
  }>(base + "/init", { contentType, size: file.size }, { headers });

  const { bucket, key, uploadId, partSize } = init.data;
  const partCount = Math.ceil(file.size / partSize);
  const parts: { PartNumber: number; ETag: string }[] = new Array(partCount);
  const sentPerPart: number[] = new Array(partCount).fill(0);

  const report = () => {
    const loaded = sentPerPart.reduce((a, b) => a + b, 0);
    onProgress?.({ phase: "uploading", loaded: Math.min(loaded, file.size), total: file.size });
  };

  // No retries in the MVP (A3): a failed piece fails the whole file.
  async function uploadPiece(index: number): Promise<string> {
    const start = index * partSize;
    const blob = file.slice(start, Math.min(file.size, start + partSize));

    try {
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
      if (err instanceof UploadCancelled || internal.signal.aborted) throw new UploadCancelled();
      throw err;
    }
  }

  // Keeps the upload alive for the storage cleaner while pieces are in flight.
  const heartbeat = setInterval(() => {
    api.post(base + "/touch", { bucket, key, uploadId }, { headers }).catch(() => {});
  }, HEARTBEAT_MS);

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

    clearInterval(heartbeat);
    onProgress?.({ phase: "finishing", loaded: file.size, total: file.size });

    const done = await api.post<UploadedVideo>(
      base + "/complete",
      { bucket, key, uploadId, parts, name: file.name },
      { headers },
    );

    return { video: done.data, version: done.headers?.["x-project-version"] };
  } catch (err) {
    clearInterval(heartbeat);
    // Free the pieces already stored. Best effort: ignore errors here
    // (the storage cleaner removes them anyway if this call is lost).
    try {
      await api.post(base + "/abort", { bucket, key, uploadId }, { headers });
    } catch {}
    throw err;
  }
}
/** Every supported video inside a zip (A6); other entries are ignored. */
export async function extractZipVideos(zipFile: File): Promise<File[]> {
  const zip = await JSZip.loadAsync(zipFile);
  const videos: File[] = [];
  for (const entry of Object.values(zip.files)) {
    if (entry.dir || entry.name.startsWith("__MACOSX/")) continue;
    const base = entry.name.split("/").pop() ?? "";
    if (!base || base.startsWith(".")) continue;
    const mime = VIDEO_EXT_TO_MIME[base.split(".").pop()?.toLowerCase() ?? ""];
    if (!mime) continue;
    const blob = await entry.async("blob");
    videos.push(new File([blob], base, { type: mime }));
  }
  return videos;
}
