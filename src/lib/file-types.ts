// File types a digital product can be. Safe to use in the browser too.

export const FILE_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  epub: "application/epub+zip",
  zip: "application/zip",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  mp4: "video/mp4",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  txt: "text/plain",
  csv: "text/csv",
};
export const FILE_ACCEPT = Object.keys(FILE_TYPES).map((e) => `.${e}`).join(",");

export const fileExt = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

// "PDF · 2.4 MB"
export function fileLabel(name: string | null, bytes: number | null) {
  if (!name) return "";
  const size = !bytes ? "" : bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return [fileExt(name).toUpperCase(), size].filter(Boolean).join(" · ");
}

