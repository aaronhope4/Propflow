import type { Express, NextFunction, Request, Response } from "express";
import multerLib from "multer";
import type { FileFilterCallback } from "multer";
import { createContext } from "../_core/context";
import { storagePut } from "../storage";
import * as db2 from "../db2";

const multer = (multerLib as any).default ?? multerLib;
export const MAX_VENDOR_CERTIFICATE_SIZE = 16 * 1024 * 1024;
const CERTIFICATE_MIMES: Record<string, string> = {
  pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
};

function certificateMime(fileName: string) {
  return CERTIFICATE_MIMES[fileName.split(".").pop()?.toLowerCase() ?? ""];
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_VENDOR_CERTIFICATE_SIZE, files: 1 },
  fileFilter: (_req: Request, file: Express.Multer.File, callback: FileFilterCallback) => {
    if (!certificateMime(file.originalname)) return callback(new Error("Insurance certificates must be a PDF, JPG, or PNG"));
    callback(null, true);
  },
});

export function registerVendorCertificateUploadRoute(app: Express) {
  const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
    const ctx = await createContext({ req, res } as any);
    if (!ctx.user || ctx.user.role !== "admin" || !ctx.user.orgId) return res.status(403).json({ error: "Admin access required" });
    (req as any).ctxUser = ctx.user;
    next();
  };
  const parseCertificate = (req: Request, res: Response, next: NextFunction) => upload.single("file")(req, res, (error: unknown) => {
    if (error) return res.status(400).json({ error: error instanceof Error ? error.message : "Invalid certificate upload" });
    next();
  });

  app.post("/api/vendors/certificates/upload", requireAdmin, parseCertificate, async (req, res) => {
    try {
      const user = (req as any).ctxUser;
      const vendorId = Number(req.body.vendorId);
      const expiresAt = String(req.body.expiresAt ?? "");
      const name = String(req.body.name ?? "").trim();
      const file = req.file;
      if (!file) return res.status(400).json({ error: "Select an insurance certificate" });
      if (!Number.isInteger(vendorId) || vendorId <= 0) return res.status(400).json({ error: "A valid vendor is required" });
      if (!/^\d{4}-\d{2}-\d{2}$/.test(expiresAt)) return res.status(400).json({ error: "A valid expiry date is required" });
      const vendor = await db2.getVendorById(vendorId, user.orgId);
      if (!vendor) return res.status(404).json({ error: "Vendor not found" });
      const mimeType = certificateMime(file.originalname);
      if (!mimeType) return res.status(400).json({ error: "Unsupported certificate type" });
      const extension = file.originalname.split(".").pop()?.toLowerCase() ?? "bin";
      const { key, url } = await storagePut(`vendors/${user.orgId}/insurance/${vendorId}/${Date.now()}.${extension}`, file.buffer, mimeType);
      const id = await db2.createVendorCertificate({
        orgId: user.orgId, vendorId, name: name || file.originalname.replace(/\.[^.]+$/, ""),
        fileName: file.originalname, fileKey: key, fileUrl: url, mimeType, fileSize: file.size,
        expiresAt: expiresAt as any,
      });
      res.status(201).json({ id, key, url });
    } catch (error: any) {
      console.error("[vendor certificate/upload]", error);
      res.status(500).json({ error: error?.message ?? "Certificate upload failed" });
    }
  });
}
