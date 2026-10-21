import { useMutation, useQueryClient } from "@tanstack/react-query";
import JSZip from "jszip";
import { api } from "../axios";
import { createBlobUrlFromFile, downloadBlob } from "../utils";
import type { ProjectVideo } from "../projects";

export const deleteProjectVideo = async ({
  uid,
  pid,
  videoId,
  token,
  projectVersion,
}: {
  uid: string;
  pid: string;
  videoId: string;
  token: string;
  projectVersion: number;
}) => {
  const response = await api.delete(`/projects/${uid}/${pid}/video/${videoId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Project-Version": String(projectVersion),
    },
  });

  if (response.status !== 204) throw new Error("Failed to delete video");

  return response.headers?.["x-project-version"] as string | undefined;
};

export const useDeleteProjectVideo = (
  uid: string,
  pid: string,
  token: string,
  ownerId?: string,
  shareId?: string,
) => {
  const qc = useQueryClient();
  const projectKey = ["project", uid, pid, token, ownerId, shareId];

  return useMutation({
    mutationFn: (args: { videoId: string; projectVersion: number }) =>
      deleteProjectVideo({
        uid,
        pid,
        token,
        videoId: args.videoId,
        projectVersion: args.projectVersion,
      }),

    onSuccess: (newVersionHeader) => {
      const v = Number(newVersionHeader);
      if (Number.isFinite(v)) {
        qc.setQueryData(projectKey, (old: any) => (old ? { ...old, version: v } : old));
      }
      qc.invalidateQueries({ queryKey: projectKey, refetchType: "all" });
    },
  });
};

// ------------------------- download all videos as a ZIP -------------------------

// The ZIP is built in the browser's memory, so very large projects can't use it.
// Above this size the UI points to the direct download instead.
export const MAX_ZIP_BYTES = 1024 * 1024 * 1024; // 1 GB

export const totalVideoBytes = (videos: ProjectVideo[]) =>
  videos.reduce((n, v) => n + (v.size ?? 0), 0);

export const downloadProjectVideosZip = async ({
  projectName,
  videos,
}: {
  projectName: string;
  videos: ProjectVideo[];
}) => {
  if (totalVideoBytes(videos) > MAX_ZIP_BYTES) throw new Error("ZIP_TOO_LARGE");

  const zip = new JSZip();
  const used = new Set<string>();

  for (const video of videos) {
    const res = await fetch(video.url);
    if (!res.ok) throw new Error("Failed to download video: " + video.name);

    // keep names unique inside the zip
    let name = video.name;
    for (let n = 1; used.has(name); n++) {
      const dot = video.name.lastIndexOf(".");
      name =
        dot > 0
          ? `${video.name.slice(0, dot)} (${n})${video.name.slice(dot)}`
          : `${video.name} (${n})`;
    }
    used.add(name);

    zip.file(name, await res.blob());
  }

  // STORE = no compression. Videos are already compressed, so deflating them
  // wastes time and saves almost nothing. The files go in byte for byte.
  const blob = await zip.generateAsync({ type: "blob", compression: "STORE" });
  const file = new File([blob], `${projectName}_videos.zip`, { type: "application/zip" });

  return { name: projectName, file };
};

export const useDownloadProjectVideosZip = () => {
  return useMutation({
    mutationFn: downloadProjectVideosZip,
    onSuccess: async (project) => {
      const blobUrl = await createBlobUrlFromFile(project.file);
      downloadBlob(project.file.name, blobUrl);
    },
  });
};
