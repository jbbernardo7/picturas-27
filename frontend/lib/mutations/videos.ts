import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../axios";

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