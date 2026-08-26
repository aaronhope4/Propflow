import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDocumentByShareToken: vi.fn(),
  storageGetSignedUrl: vi.fn(),
}));

vi.mock("./db", () => ({ getDocumentByShareToken: mocks.getDocumentByShareToken }));
vi.mock("./storage", () => ({ storageGetSignedUrl: mocks.storageGetSignedUrl }));

import { registerPublicDocumentShareRoute } from "./routes/publicDocumentShare";

function createApp() {
  const app = express();
  registerPublicDocumentShareRoute(app);
  return app;
}

describe("GET /share/doc/:token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.storageGetSignedUrl.mockResolvedValue("https://storage.example.test/signed-document");
  });

  it("redirects a valid active share token to a short-lived storage URL", async () => {
    mocks.getDocumentByShareToken.mockResolvedValue({ fileKey: "documents/property/1/lease.pdf", shareExpiresAt: new Date(Date.now() + 60_000) });
    const response = await request(createApp()).get("/share/doc/active-token");
    expect(response.status).toBe(302);
    expect(response.headers.location).toBe("https://storage.example.test/signed-document");
    expect(mocks.storageGetSignedUrl).toHaveBeenCalledWith("documents/property/1/lease.pdf");
  });

  it("returns unavailable for revoked and expired tokens", async () => {
    mocks.getDocumentByShareToken.mockResolvedValueOnce(undefined).mockResolvedValueOnce({ fileKey: "documents/property/1/lease.pdf", shareExpiresAt: new Date(Date.now() - 60_000) });
    const revoked = await request(createApp()).get("/share/doc/revoked-token");
    const expired = await request(createApp()).get("/share/doc/expired-token");
    expect(revoked.status).toBe(410);
    expect(expired.status).toBe(410);
    expect(mocks.storageGetSignedUrl).not.toHaveBeenCalled();
  });
});
