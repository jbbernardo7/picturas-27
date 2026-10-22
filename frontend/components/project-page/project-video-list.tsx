"use client";

import { useEffect, useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { useRouter, useSearchParams } from "next/navigation";
import { useCanEditProject, useProjectInfo } from "@/providers/project-provider";
import { useSession } from "@/providers/session-provider";
import type { ResultFrames, ResultVideo } from "@/lib/projects";
import { ProjectVideo } from "./project-video";

export function ProjectVideoList({
  results,
  setCurrentVideoId,
}: {
  results: { videos: ResultVideo[]; frames?: ResultFrames[] };
  // receives the video open in the player (edit mode only), null otherwise
  setCurrentVideoId?: (id: string | null) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get("view") ?? "grid";
  const mode = searchParams.get("mode") ?? "edit";
  const owner = searchParams.get("owner");
  const share = searchParams.get("share");

  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  const [jumpTo, setJumpTo] = useState<number | null>(null);

  const project = useProjectInfo();
  const canEdit = useCanEditProject();
  const session = useSession();
  const isOwner = session.user._id === (owner ?? session.user._id);

  // edit mode: the project's videos. results mode: the edited videos.
  const isResults = mode === "results";
  const videos = isResults ? results.videos : (project.videos ?? []);
  // UC-VID-003: extracted frames live in an image project, linked from here
  const frames = isResults ? (results.frames ?? []) : [];
  const videoName = (id: string) => project.videos?.find((v) => v._id === id)?.name ?? "video";

  useEffect(() => {
    if (view === "grid") {
      setApi(undefined);
      setJumpTo(null);
    }
  }, [view]);

  // The video tools act on the video open in the player.
  const openVideoId =
    view === "carousel" && !isResults && current > 0 ? (videos[current - 1]?._id ?? null) : null;
  useEffect(() => {
    setCurrentVideoId?.(openVideoId);
  }, [openVideoId, setCurrentVideoId]);

  useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    const handleSelect = () => {
      setCurrent(api.selectedScrollSnap() + 1);
      // stop whatever was playing on the previous slide
      document.querySelectorAll("video").forEach((v) => v.pause());
    };
    api.on("select", handleSelect);

    if (jumpTo !== null && jumpTo !== api.selectedScrollSnap()) {
      api.scrollTo(jumpTo, true);
      setJumpTo(null);
    }

    return () => {
      api.off("select", handleSelect);
    };
  }, [api, jumpTo, videos.length]);

  return (
    <div className="size-full flex flex-col">
      {frames.length > 0 && (
        <div className="m-2 space-y-1 rounded-md border bg-muted/40 p-3 text-sm">
          {frames.map((f) => (
            <div key={`${f._id}-${f.projectId}`} className="flex items-center justify-between gap-2">
              <span>
                {f.count} frame{f.count === 1 ? "" : "s"} of <b>{videoName(f._id)}</b> added to{" "}
                <b>{f.projectName ?? "a project that no longer exists"}</b>
              </span>
              {f.projectName && f.ownerId === session.user._id && (
                <button
                  className="text-indigo-500 hover:underline"
                  onClick={() => router.push(`/dashboard/${f.projectId}`)}
                >
                  Open project
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="flex-1 min-h-0">
      {view === "grid" || videos.length <= 0 ? (
        // Grid view
        <div className="size-full flex flex-col items-center">
          {videos.length > 0 ? (
            <>
              <div className="relative pt-4 pb-2 text-gray-500 text-sm after:h-2 after:bg-gradient-to-b after:from-background after:to-background/10 after:w-full after:absolute after:bottom-0 after:translate-y-2 after:z-50 w-full text-center flex flex-col">
                Select a video from the grid to watch it.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 p-2 overflow-scroll overflow-x-hidden h-fit">
                {videos.map((video, index) => (
                  <button
                    key={video._id}
                    className="aspect-square"
                    onClick={() => {
                      setJumpTo(index);

                      const params = new URLSearchParams();
                      params.set("mode", mode);
                      params.set("view", "carousel");
                      if (owner) params.set("owner", owner);
                      if (share) params.set("share", share);

                      router.push(`?${params.toString()}`);
                    }}
                  >
                    <ProjectVideo video={video} readOnly={isResults} />
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <p className="text-gray-500 text-xl">
                {isResults
                  ? frames.length > 0
                    ? "The frames are in the image project above."
                    : "No results found. Apply your changes and try again."
                  : canEdit && isOwner
                    ? "Add a video to start."
                    : "This project has no videos."}
              </p>
            </div>
          )}
        </div>
      ) : (
        // Carousel view
        <div className="size-full px-2 sm:px-16 py-2">
          <Carousel setApi={setApi}>
            <CarouselContent className="aspect-auto h-[calc(100vh-99px-0.5rem-36px)] xl:h-[calc(100vh-55px-0.5rem-36px)]">
              {videos.map((video) => (
                <CarouselItem key={video._id}>
                  <ProjectVideo video={video} readOnly={isResults} player animation={false} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden sm:flex" />
            <CarouselNext className="hidden sm:flex" />
          </Carousel>
          <div className="py-2 text-center text-sm text-muted-foreground">
            {current} / {count}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
