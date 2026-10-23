"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Download, Play, Trash } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useCanEditProject, useProjectInfo } from "@/providers/project-provider";
import { useSession } from "@/providers/session-provider";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error-messages";
import type { ProjectVideo as ProjectVideoData } from "@/lib/projects";
import { useDeleteProjectVideo } from "@/lib/mutations/videos";

// Only what is needed to show a video: results (edited videos) have no size or status.
type VideoLike = Pick<ProjectVideoData, "_id" | "name" | "url">;

interface VideoItemProps {
  video: VideoLike;
  // results can be watched and downloaded, but not deleted from here
  readOnly?: boolean;
  // false: thumbnail card for the grid. true: full player for the carousel.
  player?: boolean;
  animation?: boolean;
}

export function downloadVideo(video: VideoLike) {
  const a = document.createElement("a");
  a.href = video.url;
  a.download = video.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function ProjectVideo({ video, readOnly = false, player = false, animation = true }: VideoItemProps) {
  const searchParams = useSearchParams();
  const [open, setOpen] = useState<boolean>(false);

  const { _id: pid, version } = useProjectInfo();
  const canEdit = useCanEditProject();
  const session = useSession();
  const ownerId = searchParams.get("owner") ?? session.user._id;
  const shareId = searchParams.get("share") ?? undefined;
  // the backend only lets the owner delete videos
  const canDelete = !readOnly && canEdit && session.user._id === ownerId;

  const deleteVideo = useDeleteProjectVideo(
    session.user._id,
    pid as string,
    session.token,
    ownerId,
    shareId,
  );
  const { toast } = useToast();

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger>
          <Card className="group relative overflow-hidden size-full bg-black">
            <video
              // "#t=0.1" makes the browser show a frame instead of a black box
              src={player ? video.url : `${video.url}#t=0.1`}
              controls={player}
              muted={!player}
              playsInline
              preload="metadata"
              className={cn(
                "size-full object-contain",
                !player && animation && "transition-all group-hover:scale-105",
              )}
            />
            {!player && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="rounded-full bg-black/60 p-3">
                  <Play className="size-6 text-white" />
                </div>
              </div>
            )}
            {!player && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1 pt-4">
                <p className="truncate text-xs text-white">{video.name}</p>
              </div>
            )}
          </Card>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {canDelete && (
            <ContextMenuItem
              className="flex justify-between"
              onSelect={() => setOpen(true)}
            >
              <span>Delete</span>
              <Trash className="size-4" />
            </ContextMenuItem>
          )}
          <ContextMenuItem
            className="flex justify-between"
            onSelect={() => downloadVideo(video)}
          >
            <span>Download</span>
            <Download className="size-4" />
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button
              variant="destructive"
              onClick={() => {
                setOpen(false);
                deleteVideo.mutate(
                  { videoId: video._id, projectVersion: version },
                  {
                    onSuccess: () => {
                      toast({ title: `Video ${video.name} deleted successfully.` });
                    },
                    onError: (error) => {
                      const { title, description } = getErrorMessage("project-delete", error);
                      toast({ title, description, variant: "destructive" });
                    },
                  },
                );
              }}
            >
              Permanently Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
