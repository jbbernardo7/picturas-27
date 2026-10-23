"use client";

import AppDropzone from "@/components/app-dropzone";
import NewProjectDialog from "@/components/dashboard-sidebar/new-project-dialog";
import { extractZipImages } from "@/lib/utils";
import { extractZipVideos, isImageFile, isZipFile, videoMimeType } from "@/lib/video-upload";
import { ImagePlus } from "lucide-react";
import { useState } from "react";

const LIBRARY_ACCEPT = {
  "image/png": [".png"],
  "image/jpeg": [".jpeg"],
  "image/jpg": [".jpg"],
  "application/zip": [".zip"],
  "video/mp4": [".mp4"],
  "video/webm": [".webm"],
  "video/quicktime": [".mov"],
};

export default function Dashboard() {
  const [files, setFiles] = useState<File[]>([]);

  const handleDrop = async (acceptedFiles: File[]) => {
    // Images and videos are both accepted here; the dialog sorts them by project type (FA1).
    const compatibleFiles: File[] = [];
    for (const file of acceptedFiles) {
      if (isZipFile(file)) {
        compatibleFiles.push(...(await extractZipImages(file)));
        compatibleFiles.push(...(await extractZipVideos(file)));
      } else if (isImageFile(file) || videoMimeType(file)) {
        compatibleFiles.push(file);
      }
    }

    // Handle duplicate names
    const duplicateNames = new Set<string>();
    files.forEach((file) => duplicateNames.add(file.name));
    const uniqueFiles = compatibleFiles.map((file) => {
      if (duplicateNames.has(file.name)) {
        const newFile = new File(
          [file],
          `${file.name.split(".")[0]} (${duplicateNames.size}).${file.name.split(".")[1]}`,
        );
        duplicateNames.add(newFile.name);
        return newFile;
      }
      duplicateNames.add(file.name);
      return file;
    });

    setFiles(uniqueFiles);
  };

  return (
    <div className="p-8 h-full">
      <NewProjectDialog files={files} setFiles={setFiles}>
        <AppDropzone
          onDrop={handleDrop}
          accept={LIBRARY_ACCEPT}
          rejectDescription="Please upload images (.png, .jpeg, .jpg), videos (.mp4, .webm, .mov) or a .zip file"
        >
          <div className="flex flex-col gap-4 items-center justify-center max-w-[20rem]">
            <ImagePlus size={100} />
            <p className="text-2xl font-medium">
              Pick a project or drag and drop some images, videos or a .zip to
              create a new one
            </p>
          </div>
        </AppDropzone>
      </NewProjectDialog>
    </div>
  );
}
