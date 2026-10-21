import {
  extractZipVideos,
  isImageFile,
  isZipFile,
  validateVideoFile,
} from "./video-upload";

/**
 * Sorts files dropped on a video zone: valid videos go on, images are returned
 * apart (the caller decides: warning on a new project, rejection on an existing
 * one) and everything else gets its UC error message. Videos inside a .zip are
 * checked one by one and invalid entries are ignored (A6).
 */
export async function sortVideoDrop(
  list: File[],
): Promise<{ videos: File[]; images: File[]; errors: string[] }> {
  const videos: File[] = [];
  const images: File[] = [];
  const errors: string[] = [];

  for (const file of list) {
    if (isZipFile(file)) {
      let inside: File[] = [];
      try {
        inside = await extractZipVideos(file);
      } catch {
        errors.push(`${file.name}: could not read the zip.`);
        continue;
      }
      const valid = inside.filter((v) => validateVideoFile(v) === null);
      if (valid.length === 0) errors.push(`${file.name}: no valid MP4, WEBM or MOV video found.`);
      videos.push(...valid);
    } else if (isImageFile(file)) {
      images.push(file);
    } else {
      const problem = validateVideoFile(file);
      if (problem) errors.push(`${file.name}: ${problem}`);
      else videos.push(file);
    }
  }

  return { videos, images, errors };
}
