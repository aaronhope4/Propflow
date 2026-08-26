import { describe, expect, it } from "vitest";
import { getDocumentMimeType, MAX_DOCUMENT_SIZE } from "./routes/documentUpload";

describe("document upload validation", () => {
  it("accepts supported document extensions and maps their storage MIME types", () => {
    expect(getDocumentMimeType("lease.PDF")).toBe("application/pdf");
    expect(getDocumentMimeType("inspection.png")).toBe("image/png");
    expect(getDocumentMimeType("rent-roll.xlsx")).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  });

  it("rejects unsafe or extensionless uploads and maintains the 16 MB boundary", () => {
    expect(getDocumentMimeType("malware.exe")).toBeUndefined();
    expect(getDocumentMimeType("README")).toBeUndefined();
    expect(MAX_DOCUMENT_SIZE).toBe(16 * 1024 * 1024);
  });
});
