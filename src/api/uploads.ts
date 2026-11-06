import { api, ApiError } from "./client";

export const POSTER_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const POSTER_MAX_BYTES = 5 * 1024 * 1024; // the API has no size limit, so only this form enforces it

/** A message when the file cannot be a poster, otherwise null. */
export function validatePoster(file: File) {
  if (!POSTER_TYPES.includes(file.type))
    return "Use a JPEG, PNG or WebP image.";
  if (file.size > POSTER_MAX_BYTES) return "The image must be 5 MB or smaller.";
  return null;
}

/** Uploads straight to storage and returns the fileUrl to send as imageUrl. */
export async function uploadPoster(file: File) {
  const { uploadUrl, fileUrl } = await api<{
    uploadUrl: string;
    fileUrl: string;
  }>("/events/image-upload", {
    method: "POST",
    body: { contentType: file.type },
  });
  // A plain fetch on purpose: the signature is in the URL, the Content-Type must be the one asked for,
  // and an Authorization header would make storage reject the request.
  let res: Response;
  try {
    res = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
  } catch {
    throw new ApiError(
      0,
      "Could not upload the poster. Check your connection and the storage CORS rule.",
    );
  }
  if (!res.ok) throw new ApiError(res.status, "Could not upload the poster.");
  return fileUrl;
}
