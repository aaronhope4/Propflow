import type { CookieOptions, Request } from "express";

export function getSessionCookieOptions(
  req: Request
): Pick<
  CookieOptions,
  "domain" | "httpOnly" | "path" | "sameSite" | "secure"
> {
  const isHttps =
    req.protocol === "https" ||
    req.headers["x-forwarded-proto"] === "https";

  return {
    httpOnly: true,
    path: "/",

    // Local development:
    // http://localhost:3000 cannot use SameSite=None without Secure.
    //
    // Production HTTPS:
    // SameSite=None + Secure works for cross-site deployments.
    sameSite: isHttps ? "none" : "lax",

    secure: isHttps,
  };
}