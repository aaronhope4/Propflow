import type { Express, Request, Response } from "express";
import { getDocumentByShareToken } from "../db";
import { isShareExpired } from "../documentShare";
import { storageGetSignedUrl } from "../storage";

export function registerPublicDocumentShareRoute(app: Express) {
  app.get("/share/doc/:token", async (req: Request, res: Response) => {
    try {
      const document = await getDocumentByShareToken(req.params.token);
      if (!document || isShareExpired(document.shareExpiresAt)) {
        res.status(410).type("html").send("<h1>Link unavailable</h1><p>This document share link has expired or was revoked.</p>");
        return;
      }

      const signedUrl = await storageGetSignedUrl(document.fileKey);
      res.redirect(302, signedUrl);
    } catch (error) {
      console.error("[public-document-share]", error);
      res.status(500).type("html").send("<h1>Unable to open document</h1><p>Please try the link again later.</p>");
    }
  });
}
