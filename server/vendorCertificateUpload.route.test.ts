import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createContext: vi.fn(), getVendorById: vi.fn(), createVendorCertificate: vi.fn(), storagePut: vi.fn() }));
vi.mock("./_core/context", () => ({ createContext: mocks.createContext }));
vi.mock("./db2", () => ({ getVendorById: mocks.getVendorById, createVendorCertificate: mocks.createVendorCertificate }));
vi.mock("./storage", () => ({ storagePut: mocks.storagePut }));
import { registerVendorCertificateUploadRoute } from "./routes/vendorCertificateUpload";

function createApp() { const app = express(); registerVendorCertificateUploadRoute(app); return app; }

describe("POST /api/vendors/certificates/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createContext.mockResolvedValue({ user: { id: 7, orgId: 5, role: "admin" } });
    mocks.getVendorById.mockResolvedValue({ id: 82, orgId: 5, name: "Jordan Lee", company: "Acme Mechanical" });
    mocks.storagePut.mockResolvedValue({ key: "vendors/5/insurance/82/cert.pdf", url: "/manus-storage/vendors/5/insurance/82/cert.pdf" });
    mocks.createVendorCertificate.mockResolvedValue(44);
  });

  it("stores a supported certificate only for an organization-owned vendor", async () => {
    const response = await request(createApp()).post("/api/vendors/certificates/upload")
      .field("vendorId", "82").field("expiresAt", "2027-08-14").field("name", "General liability")
      .attach("file", Buffer.from("pdf"), { filename: "liability.pdf", contentType: "application/pdf" });
    expect(response.status).toBe(201);
    expect(mocks.getVendorById).toHaveBeenCalledWith(82, 5);
    expect(mocks.storagePut).toHaveBeenCalledWith(expect.stringMatching(/^vendors\/5\/insurance\/82\//), expect.any(Buffer), "application/pdf");
    expect(mocks.createVendorCertificate).toHaveBeenCalledWith(expect.objectContaining({ vendorId: 82, orgId: 5, name: "General liability", expiresAt: "2027-08-14" }));
  });

  it("rejects unsupported file types before writing to storage", async () => {
    const response = await request(createApp()).post("/api/vendors/certificates/upload")
      .field("vendorId", "82").field("expiresAt", "2027-08-14")
      .attach("file", Buffer.from("unsafe"), { filename: "certificate.exe", contentType: "application/octet-stream" });
    expect(response.status).toBe(400);
    expect(response.body.error).toContain("PDF, JPG, or PNG");
    expect(mocks.storagePut).not.toHaveBeenCalled();
  });

  it("requires an administrator before accepting a certificate", async () => {
    mocks.createContext.mockResolvedValue({ user: { id: 8, orgId: 5, role: "manager" } });
    const response = await request(createApp()).post("/api/vendors/certificates/upload")
      .field("vendorId", "82").field("expiresAt", "2027-08-14")
      .attach("file", Buffer.from("pdf"), { filename: "liability.pdf", contentType: "application/pdf" });
    expect(response.status).toBe(403);
    expect(mocks.storagePut).not.toHaveBeenCalled();
  });
});
