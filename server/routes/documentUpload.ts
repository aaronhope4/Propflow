import type { Express, Request, Response, NextFunction } from "express";
import multerLib from "multer";
import type { FileFilterCallback } from "multer";
import { storagePut } from "../storage";
import { createContext } from "../_core/context";
import { createDocument } from "../db";

const multer = (multerLib as any).default ?? multerLib;
export const MAX_DOCUMENT_SIZE = 16 * 1024 * 1024;
const DOCUMENT_MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  txt: "text/plain",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
};
const DOCUMENT_CATEGORIES = new Set(["lease", "addendum", "notice", "inspection", "insurance", "tax", "maintenance", "other"]);

export function getDocumentMimeType(fileName: string): string | undefined {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  return DOCUMENT_MIME_BY_EXTENSION[extension];
}

function documentTitle(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  return (lastDot > 0 ? fileName.slice(0, lastDot) : fileName).replace(/[-_]+/g, " ").slice(0, 255);
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_DOCUMENT_SIZE, files: 1 },
  fileFilter: (_req: Request, file: Express.Multer.File, callback: FileFilterCallback) => {
    if (!getDocumentMimeType(file.originalname)) {
      callback(new Error("Unsupported document type"));
      return;
    }
    callback(null, true);
  },
});

export function registerDocumentUploadRoute(app: Express) {
  const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
    const ctx = await createContext({ req, res } as any);
    if (!ctx.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    (req as any).ctxUser = ctx.user;
    next();
  };

  const parseDocument = (req: Request, res: Response, next: NextFunction) => {
    upload.single("file")(req, res, (error: unknown) => {
      if (error) {
        const message = error instanceof Error ? error.message : "Invalid document upload";
        res.status(400).json({ error: message });
        return;
      }
      next();
    });
  };

  app.post("/api/documents/upload", requireAuth, parseDocument, async (req: Request, res: Response) => {
    try {
      const file = req.file;
      const user = (req as any).ctxUser;
      const propertyId = Number(req.body.propertyId);
      const tenantId = req.body.tenantId ? Number(req.body.tenantId) : undefined;
      const category = String(req.body.category || "other");
      if (!file) {
        res.status(400).json({ error: "No document provided" });
        return;
      }
      if (!Number.isInteger(propertyId) || propertyId <= 0) {
        res.status(400).json({ error: "A valid property is required" });
        return;
      }
      if (tenantId !== undefined && (!Number.isInteger(tenantId) || tenantId <= 0)) {
        res.status(400).json({ error: "Invalid tenant" });
        return;
      }
      if (!DOCUMENT_CATEGORIES.has(category)) {
        res.status(400).json({ error: "Invalid document category" });
        return;
      }

      const mimeType = getDocumentMimeType(file.originalname);
      if (!mimeType) {
        res.status(400).json({ error: "Unsupported document type" });
        return;
      }
      const extension = file.originalname.split(".").pop()?.toLowerCase() ?? "bin";
      const { key, url } = await storagePut(`documents/property/${propertyId}/${Date.now()}.${extension}`, file.buffer, mimeType);
      await createDocument({
        entityType: "property",
        entityId: propertyId,
        propertyId,
        tenantId,
        name: documentTitle(file.originalname),
        category: category as any,
        fileName: file.originalname,
        fileKey: key,
        fileUrl: url,
        mimeType,
        fileSize: file.size,
        uploadedBy: user.id,
      });
      res.status(201).json({ key, url });
    } catch (error: any) {
      console.error("[document/upload]", error);
      res.status(500).json({ error: error.message ?? "Document upload failed" });
    }
  });
}
