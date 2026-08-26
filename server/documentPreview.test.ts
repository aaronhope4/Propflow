import { describe, expect, it } from "vitest";
import { getDocumentPreviewKind } from "../client/src/lib/documentPreview";

describe("getDocumentPreviewKind", () => {
  it("uses image previews for supported image MIME types and file extensions", () => {
    expect(getDocumentPreviewKind({ mimeType: "image/jpeg", fileName: "lease.pdf" })).toBe("image");
    expect(getDocumentPreviewKind({ fileName: "inspection.PNG" })).toBe("image");
  });

  it("uses PDF previews for PDF MIME types and file extensions", () => {
    expect(getDocumentPreviewKind({ mimeType: "application/pdf", fileName: "notice.docx" })).toBe("pdf");
    expect(getDocumentPreviewKind({ fileName: "signed-lease.pdf" })).toBe("pdf");
  });

  it("uses the standard file tile for non-previewable documents", () => {
    expect(getDocumentPreviewKind({ mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", fileName: "lease.docx" })).toBe("file");
  });
});
