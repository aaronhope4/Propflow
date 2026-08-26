import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createContext: vi.fn(),
  createDocument: vi.fn(),
  storagePut: vi.fn(),
}));

vi.mock("./_core/context", () => ({ createContext: mocks.createContext }));
vi.mock("./db", () => ({ createDocument: mocks.createDocument }));
vi.mock("./storage", () => ({ storagePut: mocks.storagePut }));

import { registerDocumentUploadRoute } from "./routes/documentUpload";

function createApp() {
  const app = express();
  registerDocumentUploadRoute(app);
  return app;
}

describe("POST /api/documents/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createContext.mockResolvedValue({ user: { id: 42 } });
    mocks.storagePut.mockResolvedValue({ key: "documents/property/1/receipt_abc.pdf", url: "/manus-storage/documents/property/1/receipt_abc.pdf" });
    mocks.createDocument.mockResolvedValue(undefined);
  });

  it("stores a supported upload and persists its document metadata", async () => {
    const response = await request(createApp())
      .post("/api/documents/upload")
      .field("propertyId", "1")
      .field("category", "other")
      .attach("file", Buffer.from("test-pdf"), { filename: "Receipt.PDF", contentType: "application/pdf" });

    expect(response.status).toBe(201);
    expect(response.body.url).toContain("receipt_abc.pdf");
    expect(mocks.storagePut).toHaveBeenCalledWith(expect.stringMatching(/^documents\/property\/1\//), expect.any(Buffer), "application/pdf");
    expect(mocks.createDocument).toHaveBeenCalledWith(expect.objectContaining({ propertyId: 1, fileName: "Receipt.PDF", uploadedBy: 42 }));
  });

  it("rejects unsupported document types before storage", async () => {
    const response = await request(createApp())
      .post("/api/documents/upload")
      .field("propertyId", "1")
      .attach("file", Buffer.from("unsafe"), { filename: "unsafe.exe", contentType: "application/octet-stream" });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("Unsupported document type");
    expect(mocks.storagePut).not.toHaveBeenCalled();
  });

  it("requires a valid property before persisting a document", async () => {
    const response = await request(createApp())
      .post("/api/documents/upload")
      .field("propertyId", "not-a-number")
      .attach("file", Buffer.from("test-pdf"), { filename: "Receipt.pdf", contentType: "application/pdf" });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("valid property");
    expect(mocks.createDocument).not.toHaveBeenCalled();
  });
});
