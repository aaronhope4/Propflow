import "dotenv/config";

import express from "express";
import { createServer } from "http";
import net from "net";
import cors from "cors";

import { createExpressMiddleware } from "@trpc/server/adapters/express";

import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

import { inviteExpiryReminderHandler } from "../jobs/inviteExpiryReminder";
import { vendorInsuranceReminderHandler } from "../jobs/vendorInsuranceReminder";

import { registerMaintenanceUploadRoute } from "../routes/maintenanceUpload";
import { registerPublicDocumentShareRoute } from "../routes/publicDocumentShare";
import { registerDocumentUploadRoute } from "../routes/documentUpload";
import { registerVendorCertificateUploadRoute } from "../routes/vendorCertificateUpload";

/**
 * Check whether a TCP port is available.
 */
function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const testServer = net.createServer();

    testServer.listen(port, () => {
      testServer.close(() => resolve(true));
    });

    testServer.on("error", () => resolve(false));
  });
}

/**
 * Find an available port starting from the preferred port.
 */
async function findAvailablePort(
  startPort: number = 3000,
): Promise<number> {
  for (
    let port = startPort;
    port < startPort + 20;
    port++
  ) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }

  throw new Error(
    `No available port found starting from ${startPort}`,
  );
}

/**
 * Normalize an origin by removing trailing slashes.
 */
function normalizeOrigin(
  origin: string,
): string {
  return origin.trim().replace(/\/+$/, "");
}

/**
 * Build the allowed CORS origins.
 *
 * Local development:
 *   http://localhost:3000
 *
 * Production:
 *   APP_BASE_URL=https://your-bluehost-domain.com
 */
function getAllowedOrigins(): Set<string> {
  const origins = [
    process.env.APP_BASE_URL,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ];

  return new Set(
    origins
      .filter(
        (origin): origin is string =>
          typeof origin === "string" &&
          origin.trim().length > 0,
      )
      .map(normalizeOrigin),
  );
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  /* ---------------------------------------------------------------------- */
  /* CORS                                                                   */
  /* ---------------------------------------------------------------------- */

  const allowedOrigins =
    getAllowedOrigins();

  app.use(
    cors({
      origin(origin, callback) {
        /*
         * Non-browser requests such as curl/server-to-server requests
         * may not contain an Origin header.
         */
        if (!origin) {
          callback(null, true);
          return;
        }

        const normalizedOrigin =
          normalizeOrigin(origin);

        if (
          allowedOrigins.has(
            normalizedOrigin,
          )
        ) {
          callback(null, true);
          return;
        }

        console.warn(
          `[CORS] Blocked origin: ${origin}`,
        );

        callback(
          new Error(
            `CORS blocked origin: ${origin}`,
          ),
        );
      },

      /*
       * Required for the JWT session cookie.
       */
      credentials: true,

      methods: [
        "GET",
        "HEAD",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS",
      ],

      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "Accept",
      ],
    }),
  );

  /* ---------------------------------------------------------------------- */
  /* Body parsing                                                           */
  /* ---------------------------------------------------------------------- */

  app.use(
    express.json({
      limit: "50mb",
    }),
  );

  app.use(
    express.urlencoded({
      limit: "50mb",
      extended: true,
    }),
  );

  /* ---------------------------------------------------------------------- */
  /* Application routes                                                     */
  /* ---------------------------------------------------------------------- */

  registerStorageProxy(app);

  registerPublicDocumentShareRoute(app);

  /* ---------------------------------------------------------------------- */
  /* tRPC API                                                               */
  /* ---------------------------------------------------------------------- */

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  /* ---------------------------------------------------------------------- */
  /* File upload endpoints                                                  */
  /* ---------------------------------------------------------------------- */

  registerMaintenanceUploadRoute(app);

  registerDocumentUploadRoute(app);

  registerVendorCertificateUploadRoute(app);

  /* ---------------------------------------------------------------------- */
  /* Scheduled job endpoints                                                */
  /* ---------------------------------------------------------------------- */

  /*
   * These must be registered before Vite/static fallthrough.
   */
  app.post(
    "/api/scheduled/invite-expiry-reminder",
    inviteExpiryReminderHandler,
  );

  app.post(
    "/api/scheduled/vendor-insurance-reminder",
    vendorInsuranceReminderHandler,
  );

  /* ---------------------------------------------------------------------- */
  /* Frontend serving                                                        */
  /* ---------------------------------------------------------------------- */

  if (
    process.env.NODE_ENV ===
    "development"
  ) {
    await setupVite(
      app,
      server,
    );
  } else {
    serveStatic(app);
  }

  /* ---------------------------------------------------------------------- */
  /* Port                                                                    */
  /* ---------------------------------------------------------------------- */

  const preferredPort = parseInt(
    process.env.PORT || "3000",
    10,
  );

  const port =
    await findAvailablePort(
      preferredPort,
    );

  if (
    port !== preferredPort
  ) {
    console.log(
      `Port ${preferredPort} is busy, using port ${port} instead`,
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Start server                                                            */
  /* ---------------------------------------------------------------------- */

  server.listen(
    port,
    "0.0.0.0",
    () => {
      console.log(
        `Server running on http://0.0.0.0:${port}/`,
      );

      console.log(
        `[CORS] Allowed origins: ${Array.from(
          allowedOrigins,
        ).join(", ")}`,
      );
    },
  );
}

startServer().catch((error) => {
  console.error(
    "[Server] Startup failed:",
    error,
  );

  process.exit(1);
});