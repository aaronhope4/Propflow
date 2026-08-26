/**
 * POST /api/maintenance/upload
 * Accepts a multipart/form-data request with up to 5 image files.
 * Each file is stored in S3 via storagePut and the resulting URL is returned.
 *
 * Constraints enforced server-side:
 *  - Max 5 files per request
 *  - Max 10 MB per file
 *  - image/* MIME types only
 */
import type { Express, Request, Response, NextFunction } from "express";
import multerLib from "multer";
const multer = (multerLib as any).default ?? multerLib;
import type { FileFilterCallback } from "multer";
import { storagePut } from "../storage";
import { createContext } from "../_core/context";

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image files are allowed"));
    } else {
      cb(null, true);
    }
  },
});

export function registerMaintenanceUploadRoute(app: Express) {
  // Auth middleware
  const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
    const ctx = await createContext({ req, res } as any);
    if (!ctx.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    (req as any).ctxUser = ctx.user;
    next();
  };

  // Upload handler
  const handleUpload = async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        res.status(400).json({ error: "No images provided" });
        return;
      }

      const uploads = await Promise.all(
        files.map((file) => {
          const ext = file.originalname.split(".").pop()?.toLowerCase() ?? "jpg";
          const key = `maintenance-images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          return storagePut(key, file.buffer, file.mimetype);
        })
      );

      res.json({ urls: uploads.map((u) => u.url) });
    } catch (err: any) {
      console.error("[maintenance/upload]", err);
      res.status(500).json({ error: err.message ?? "Upload failed" });
    }
  };

  app.post(
    "/api/maintenance/upload",
    requireAuth,
    upload.array("images", MAX_FILES),
    handleUpload
  );
}
