import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

const CRON_OPEN_ID_PREFIX = "cron_";

export type SessionPayload = {
  openId: string;
  name: string;
};

export type AuthenticatedUser = User & {
  taskUid?: string;
  isCron?: boolean;
};

class SDKServer {
  /**
   * Get the JWT signing secret.
   */
  private getSessionSecret(): Uint8Array {
    if (!ENV.cookieSecret) {
      throw new Error(
        "JWT_SECRET is not configured. Please set JWT_SECRET in your environment."
      );
    }

    return new TextEncoder().encode(ENV.cookieSecret);
  }

  /**
   * Create a local PropFlow session JWT.
   */
  async createSessionToken(
    openId: string,
    options: {
      expiresInMs?: number;
      name?: string;
    } = {}
  ): Promise<string> {
    return this.signSession(
      {
        openId,
        name: options.name ?? "",
      },
      options
    );
  }

  /**
   * Sign a local PropFlow JWT.
   */
  async signSession(
    payload: SessionPayload,
    options: {
      expiresInMs?: number;
    } = {}
  ): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;

    const expirationSeconds = Math.floor(
      (issuedAt + expiresInMs) / 1000
    );

    return new SignJWT({
      openId: payload.openId,
      name: payload.name,
    })
      .setProtectedHeader({
        alg: "HS256",
        typ: "JWT",
      })
      .setIssuedAt(Math.floor(issuedAt / 1000))
      .setExpirationTime(expirationSeconds)
      .sign(this.getSessionSecret());
  }

  /**
   * Verify a PropFlow session JWT.
   */
  async verifySession(
    token: string | undefined | null
  ): Promise<{ openId: string; name: string } | null> {
    if (!token) {
      return null;
    }

    try {
      const { payload } = await jwtVerify(
        token,
        this.getSessionSecret(),
        {
          algorithms: ["HS256"],
        }
      );

      const openId = payload.openId;
      const name = payload.name;

      if (!isNonEmptyString(openId)) {
        console.warn("[Auth] Session missing openId");
        return null;
      }

      return {
        openId,
        name: typeof name === "string" ? name : "",
      };
    } catch (error) {
      console.warn(
        "[Auth] Session verification failed:",
        error instanceof Error ? error.message : error
      );

      return null;
    }
  }

  /**
   * Parse cookies from an HTTP request.
   */
  private parseCookies(
    cookieHeader: string | undefined
  ): Map<string, string> {
    if (!cookieHeader) {
      return new Map();
    }

    const parsed = parseCookieHeader(cookieHeader);

    return new Map(
      Object.entries(parsed)
    );
  }

  /**
   * Authenticate a normal PropFlow request.
   *
   * Authentication order:
   *
   * 1. Session cookie
   * 2. Authorization Bearer token
   * 3. Database user lookup
   */
  async authenticateRequest(
    req: Request
  ): Promise<AuthenticatedUser> {
    const cookies = this.parseCookies(
      req.headers.cookie
    );

    let sessionToken = cookies.get(COOKIE_NAME);

    /**
     * Allow Authorization: Bearer <token>
     *
     * This is useful for API requests and environments
     * where browser cookies are unavailable.
     */
    if (!sessionToken) {
      const authHeader = req.headers.authorization;

      if (
        typeof authHeader === "string" &&
        authHeader.startsWith("Bearer ")
      ) {
        sessionToken = authHeader.slice(7);
      }
    }

    if (!sessionToken) {
      throw ForbiddenError("Not authenticated");
    }

    const session = await this.verifySession(
      sessionToken
    );

    if (!session) {
      throw ForbiddenError("Invalid or expired session");
    }

    /**
     * Cron sessions are handled separately.
     */
    if (
      session.openId.startsWith(
        CRON_OPEN_ID_PREFIX
      )
    ) {
      return this.authenticateCronSession(
        sessionToken,
        session.openId
      );
    }

    /**
     * Normal user authentication.
     */
    const user = await db.getUserByOpenId(
      session.openId
    );

    if (!user) {
      throw ForbiddenError("User account not found");
    }

    /**
     * Update last signed-in timestamp.
     *
     * We don't need to do this for every request.
     * The login route already updates it.
     */
    return user;
  }

  /**
   * Authenticate a scheduled task.
   *
   * This keeps compatibility with your existing
   * heartbeat/scheduled jobs without using Manus OAuth
   * for normal users.
   */
  private async authenticateCronSession(
    sessionToken: string,
    openId: string
  ): Promise<AuthenticatedUser> {
    /**
     * Verify the JWT itself first.
     */
    const session = await this.verifySession(
      sessionToken
    );

    if (!session) {
      throw ForbiddenError("Invalid cron session");
    }

    if (
      !session.openId.startsWith(
        CRON_OPEN_ID_PREFIX
      )
    ) {
      throw ForbiddenError("Invalid cron session");
    }

    /**
     * Extract task UID from the JWT.
     *
     * Cron tokens should contain taskUid.
     */
    try {
      const { payload } = await jwtVerify(
        sessionToken,
        this.getSessionSecret(),
        {
          algorithms: ["HS256"],
        }
      );

      const taskUid = payload.taskUid;

      if (
        typeof taskUid !== "string" ||
        !taskUid
      ) {
        throw ForbiddenError(
          "Cron session missing taskUid"
        );
      }

      const now = new Date();

      return {
        id: -1,
        openId,
        name: "PropFlow Scheduled Task",
        email: null,
        loginMethod: null,
        role: "user",
        createdAt: now,
        updatedAt: now,
        lastSignedIn: now,
        taskUid,
        isCron: true,
      } as AuthenticatedUser;
    } catch (error) {
      if (error instanceof Error) {
        throw ForbiddenError(
          `Invalid cron session: ${error.message}`
        );
      }

      throw ForbiddenError(
        "Invalid cron session"
      );
    }
  }

  /**
   * Create a cron session token.
   *
   * This is used by scheduled jobs.
   */
  async createCronSessionToken(
    taskUid: string,
    options: {
      expiresInMs?: number;
    } = {}
  ): Promise<string> {
    if (!taskUid) {
      throw new Error(
        "taskUid is required for a cron session"
      );
    }

    const issuedAt = Date.now();
    const expiresInMs =
      options.expiresInMs ??
      60 * 60 * 1000;

    const expirationSeconds = Math.floor(
      (issuedAt + expiresInMs) / 1000
    );

    return new SignJWT({
      openId: `${CRON_OPEN_ID_PREFIX}${taskUid}`,
      name: "PropFlow Scheduled Task",
      taskUid,
    })
      .setProtectedHeader({
        alg: "HS256",
        typ: "JWT",
      })
      .setIssuedAt(Math.floor(issuedAt / 1000))
      .setExpirationTime(expirationSeconds)
      .sign(this.getSessionSecret());
  }
}

export const sdk = new SDKServer();