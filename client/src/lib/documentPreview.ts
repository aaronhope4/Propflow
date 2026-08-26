export type DocumentPreviewKind = "image" | "pdf" | "file";

type DocumentPreviewInput = {
  fileName?: string | null;
  mimeType?: string | null;
};

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp"]);

export function getDocumentPreviewKind({ fileName, mimeType }: DocumentPreviewInput): DocumentPreviewKind {
  if (mimeType?.startsWith("image/")) return "image";
  if (mimeType === "application/pdf") return "pdf";

  const extension = fileName?.split(".").pop()?.toLowerCase();
  if (extension && IMAGE_EXTENSIONS.has(extension)) return "image";
  return extension === "pdf" ? "pdf" : "file";
}
