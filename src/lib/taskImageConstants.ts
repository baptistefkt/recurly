import type { Id } from "../../convex/_generated/dataModel";

export const MAX_TASK_IMAGES = 3;
export const MAX_TASK_IMAGE_BYTES = 5 * 1024 * 1024;
export const TASK_IMAGE_ACCEPT = "image/*";

const ALLOWED = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
};

function extensionFromName(name: string): string | null {
  const parts = name.toLowerCase().split(".");
  if (parts.length < 2) return null;
  return parts[parts.length - 1] ?? null;
}

export function guessTaskImageMime(file: File): string | null {
  if (file.type && isAllowedTaskImageMime(file.type)) return file.type;
  const ext = extensionFromName(file.name);
  if (!ext) return null;
  return EXT_TO_MIME[ext] ?? null;
}

export function isAllowedTaskImageMime(type: string): boolean {
  return ALLOWED.has(type);
}

/** Returns an error message or null if valid. */
export function validateTaskImageFile(file: File): string | null {
  const inferredMime = guessTaskImageMime(file);
  if (!inferredMime) {
    return "Use JPEG, PNG, WebP, GIF, HEIC, or HEIF.";
  }
  if (file.size > MAX_TASK_IMAGE_BYTES) {
    return "Each image must be at most 5 MB.";
  }
  return null;
}

export async function uploadTaskImageFiles(
  files: File[],
  generateUploadUrl: () => Promise<string>
): Promise<Id<"_storage">[]> {
  const ids: Id<"_storage">[] = [];
  for (const file of files) {
    const contentType = guessTaskImageMime(file) ?? "application/octet-stream";
    const postUrl = await generateUploadUrl();
    const result = await fetch(postUrl, {
      method: "POST",
      headers: { "Content-Type": contentType },
      body: file,
    });
    if (!result.ok) {
      throw new Error("Image upload failed");
    }
    const json = (await result.json()) as { storageId: Id<"_storage"> };
    if (!json.storageId) {
      throw new Error("Image upload failed");
    }
    ids.push(json.storageId);
  }
  return ids;
}
