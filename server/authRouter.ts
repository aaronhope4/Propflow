/**
 * authRouter.ts
 *
 * Native email/password authentication for PropFlow.
 *
 * Features:
 * - bcrypt password hashing
 * - JWT session cookies
 * - Bearer-token fallback for browsers that block cross-site cookies
 * - Admin registration
 * - Tenant invitations
 * - Invite acceptance
 * - Password reset
 * - Password change
 *
 * Database compatibility:
 * - MySQL
 * - MySQL2
 * - Percona Server
 * - Bluehost hosted MySQL
 *
 * Important:
 * - Organization IDs are retrieved using a unique slug instead of insertId.
 * - User IDs for newly created tenant accounts are retrieved using unique openId.
 */

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

import {
  users,
  organizations,
  tenants,
} from "../drizzle/schema";

import {
  COOKIE_NAME,
  ONE_YEAR_MS,
} from "../shared/const";

import { getDb } from "./db";
import { sdk } from "./_core/sdk";
import { getSessionCookieOptions } from "./_core/cookies";

import {
  protectedProcedure,
  publicProcedure,
  router,
} from "./_core/trpc";

import {
  sendInviteEmail,
  sendPasswordResetEmail,
} from "./email";

import { ENV } from "./_core/env";

import {
  forgotPasswordIpLimiter,
  forgotPasswordEmailLimiter,
} from "./rateLimiter";

/* -------------------------------------------------------------------------- */
/* Configuration                                                              */
/* -------------------------------------------------------------------------- */

const INVITE_EXPIRY_HOURS = 72;
const RESET_PASSWORD_EXPIRY_HOURS = 1;
const SALT_ROUNDS = 10;

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Normalize email addresses consistently.
 */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Create a JWT session cookie.
 *
 * The same JWT is also returned to the frontend as sessionToken.
 * This allows the frontend to use Authorization: Bearer <token>
 * when cross-site cookies are blocked by the browser.
 */
async function createSessionCookie(
  openId: string,
  name: string,
  req: any,
  res: any,
): Promise<string> {
  const token = await sdk.createSessionToken(openId, {
    name,
    expiresInMs: ONE_YEAR_MS,
  });

  const cookieOptions =
    getSessionCookieOptions(req);

  res.cookie(
    COOKIE_NAME,
    token,
    {
      ...cookieOptions,
      maxAge: ONE_YEAR_MS,
    },
  );

  return token;
}

/**
 * Remove sensitive authentication fields
 * before returning user data.
 */
function sanitizeUser(user: any) {
  if (!user) {
    return user;
  }

  const {
    passwordHash: _passwordHash,
    inviteToken: _inviteToken,
    inviteTokenExpiry: _inviteTokenExpiry,
    resetToken: _resetToken,
    resetTokenExpiry: _resetTokenExpiry,
    ...safeUser
  } = user;

  return safeUser;
}

/**
 * Generate a unique organization slug.
 */
function createOrganizationSlug(
  name: string,
): string {
  const baseSlug =
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") ||
    "organization";

  return `${baseSlug}-${nanoid(6)}`;
}

/**
 * Resolve the application's base URL.
 *
 * Priority:
 * 1. Frontend supplied origin
 * 2. APP_BASE_URL
 * 3. localhost
 */
function getBaseUrl(
  origin?: string,
): string {
  return (
    origin?.trim() ||
    ENV.appBaseUrl ||
    "http://localhost:3000"
  ).replace(/\/+$/, "");
}

/* -------------------------------------------------------------------------- */
/* Router                                                                     */
/* -------------------------------------------------------------------------- */

export const authRouter = router({

  /* ======================================================================== */
  /* REGISTER                                                                 */
  /* ======================================================================== */

  register: publicProcedure
    .input(
      z.object({
        name: z
          .string()
          .trim()
          .min(1)
          .max(100),

        email: z
          .string()
          .trim()
          .email()
          .max(320),

        password: z
          .string()
          .min(8)
          .max(128),

        companyName: z
          .string()
          .trim()
          .min(1)
          .max(200)
          .optional(),
      }),
    )
    .mutation(
      async ({
        input,
        ctx,
      }) => {
        const db =
          await getDb();

        if (!db) {
          throw new TRPCError({
            code:
              "INTERNAL_SERVER_ERROR",
            message:
              "Database unavailable.",
          });
        }

        const normalizedEmail =
          normalizeEmail(
            input.email,
          );

        const organizationName =
          input.companyName?.trim() ||
          `${input.name.trim()}'s Company`;

        const organizationSlug =
          createOrganizationSlug(
            organizationName,
          );

        /* ------------------------------------------------------------------ */
        /* Check existing email                                               */
        /* ------------------------------------------------------------------ */

        const existingUser =
          await db
            .select()
            .from(users)
            .where(
              eq(
                users.email,
                normalizedEmail,
              ),
            )
            .limit(1);

        if (
          existingUser.length > 0
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message:
              "An account with this email already exists.",
          });
        }

        /* ------------------------------------------------------------------ */
        /* Create organization                                                */
        /* ------------------------------------------------------------------ */

        try {
          await db
            .insert(
              organizations,
            )
            .values({
              name:
                organizationName,
              slug:
                organizationSlug,
            });
        } catch (error) {
          console.error(
            "[Auth] Failed to create organization:",
            error,
          );

          throw new TRPCError({
            code:
              "INTERNAL_SERVER_ERROR",
            message:
              "Failed to create organization.",
          });
        }

        /* ------------------------------------------------------------------ */
        /* Retrieve organization by slug                                     */
        /* ------------------------------------------------------------------ */

        const organizationResult =
          await db
            .select()
            .from(organizations)
            .where(
              eq(
                organizations.slug,
                organizationSlug,
              ),
            )
            .limit(1);

        const organization =
          organizationResult[0];

        if (!organization) {
          throw new TRPCError({
            code:
              "INTERNAL_SERVER_ERROR",
            message:
              "Organization was created but could not be retrieved.",
          });
        }

        const orgId =
          organization.id;

        /* ------------------------------------------------------------------ */
        /* Hash password                                                      */
        /* ------------------------------------------------------------------ */

        const passwordHash =
          await bcrypt.hash(
            input.password,
            SALT_ROUNDS,
          );

        /* ------------------------------------------------------------------ */
        /* Create admin user                                                  */
        /* ------------------------------------------------------------------ */

        const openId =
          `email_${nanoid(24)}`;

        try {
          await db
            .insert(users)
            .values({
              openId,
              name:
                input.name.trim(),
              email:
                normalizedEmail,
              loginMethod:
                "email",
              role:
                "admin",
              passwordHash,
              orgId,
              lastSignedIn:
                new Date(),
            });
        } catch (error) {
          console.error(
            "[Auth] Failed to create user:",
            error,
          );

          throw new TRPCError({
            code:
              "INTERNAL_SERVER_ERROR",
            message:
              "Organization was created, but the user account could not be created.",
          });
        }

        /* ------------------------------------------------------------------ */
        /* Retrieve created user                                              */
        /* ------------------------------------------------------------------ */

        const createdUserResult =
          await db
            .select()
            .from(users)
            .where(
              eq(
                users.openId,
                openId,
              ),
            )
            .limit(1);

        const createdUser =
          createdUserResult[0];

        if (!createdUser) {
          throw new TRPCError({
            code:
              "INTERNAL_SERVER_ERROR",
            message:
              "User account was created but could not be retrieved.",
          });
        }

        /* ------------------------------------------------------------------ */
        /* Create session                                                     */
        /* ------------------------------------------------------------------ */

        try {
          const sessionToken =
            await createSessionCookie(
              createdUser.openId,
              createdUser.name ??
                createdUser.email ??
                input.name.trim(),
              ctx.req,
              ctx.res,
            );

          return {
            success: true,
            user:
              sanitizeUser(
                createdUser,
              ),
            orgId,
            sessionToken,
          };
        } catch (error) {
          console.error(
            "[Auth] Failed to create registration session:",
            error,
          );

          throw new TRPCError({
            code:
              "INTERNAL_SERVER_ERROR",
            message:
              "Account was created, but the login session could not be created.",
          });
        }
      },
    ),

  /* ======================================================================== */
  /* LOGIN                                                                    */
  /* ======================================================================== */

  login: publicProcedure
    .input(
      z.object({
        email:
          z.string()
            .trim()
            .email(),

        password:
          z.string()
            .min(1),
      }),
    )
    .mutation(
      async ({
        input,
        ctx,
      }) => {
        const db =
          await getDb();

        if (!db) {
          throw new TRPCError({
            code:
              "INTERNAL_SERVER_ERROR",
            message:
              "Database unavailable.",
          });
        }

        const normalizedEmail =
          normalizeEmail(
            input.email,
          );

        /* ------------------------------------------------------------------ */
        /* Query user                                                         */
        /* ------------------------------------------------------------------ */

        let result;

        try {
          result =
            await db
              .select()
              .from(users)
              .where(
                eq(
                  users.email,
                  normalizedEmail,
                ),
              )
              .limit(1);
        } catch (error: any) {
          console.error(
            "[Auth] Login database query failed:",
            error,
          );

          console.error(
            "[Auth] Database error message:",
            error?.message ??
              "Unknown database error",
          );

          console.error(
            "[Auth] Database error code:",
            error?.code ??
              "Unknown",
          );

          console.error(
            "[Auth] Database error errno:",
            error?.errno ??
              "Unknown",
          );

          console.error(
            "[Auth] Database error sqlState:",
            error?.sqlState ??
              "Unknown",
          );

          console.error(
            "[Auth] Database error sqlMessage:",
            error?.sqlMessage ??
              "Unknown",
          );

          console.error(
            "[Auth] Database error stack:",
            error?.stack ??
              "No stack available",
          );

          throw new TRPCError({
            code:
              "INTERNAL_SERVER_ERROR",
            message:
              "Unable to access the database. Please try again later.",
          });
        }

        const user =
          result[0];

        /* ------------------------------------------------------------------ */
        /* Validate credentials                                               */
        /* ------------------------------------------------------------------ */

        if (
          !user ||
          !user.passwordHash
        ) {
          throw new TRPCError({
            code:
              "UNAUTHORIZED",
            message:
              "Invalid email or password.",
          });
        }

        const passwordValid =
          await bcrypt.compare(
            input.password,
            user.passwordHash,
          );

        if (!passwordValid) {
          throw new TRPCError({
            code:
              "UNAUTHORIZED",
            message:
              "Invalid email or password.",
          });
        }

        /* ------------------------------------------------------------------ */
        /* Update last sign-in                                                */
        /* ------------------------------------------------------------------ */

        try {
          await db
            .update(users)
            .set({
              lastSignedIn:
                new Date(),
            })
            .where(
              eq(
                users.id,
                user.id,
              ),
            );
        } catch (error) {
          console.error(
            "[Auth] Failed to update lastSignedIn:",
            error,
          );

          throw new TRPCError({
            code:
              "INTERNAL_SERVER_ERROR",
            message:
              "Login succeeded, but the account could not be updated.",
          });
        }

        /* ------------------------------------------------------------------ */
        /* Create session                                                     */
        /* ------------------------------------------------------------------ */

        try {
          const sessionToken =
            await createSessionCookie(
              user.openId,
              user.name ??
                user.email ??
                "",
              ctx.req,
              ctx.res,
            );

          return {
            success: true,
            user:
              sanitizeUser(
                user,
              ),
            sessionToken,
          };
        } catch (error) {
          console.error(
            "[Auth] Failed to create login session:",
            error,
          );

          throw new TRPCError({
            code:
              "INTERNAL_SERVER_ERROR",
            message:
              "Login succeeded, but the session could not be created.",
          });
        }
      },
    ),

  /* ======================================================================== */
  /* CREATE TENANT INVITE                                                     */
  /* ======================================================================== */

  createInvite: protectedProcedure
    .input(
      z.object({
        tenantId:
          z.number(),

        email:
          z.string()
            .trim()
            .email(),

        name:
          z.string()
            .trim()
            .min(1)
            .max(100),

        origin:
          z.string()
            .url()
            .optional(),
      }),
    )
    .mutation(
      async ({
        input,
        ctx,
      }) => {

        if (
          ctx.user.role !==
          "admin"
        ) {
          throw new TRPCError({
            code:
              "FORBIDDEN",
            message:
              "Only admins can invite tenants.",
          });
        }

        if (!ctx.user.orgId) {
          throw new TRPCError({
            code:
              "FORBIDDEN",
            message:
              "Your account is not associated with an organization.",
          });
        }

        const db =
          await getDb();

        if (!db) {
          throw new TRPCError({
            code:
              "INTERNAL_SERVER_ERROR",
            message:
              "Database unavailable.",
          });
        }

        const normalizedEmail =
          normalizeEmail(
            input.email,
          );

        /* ------------------------------------------------------------------ */
        /* Verify tenant                                                      */
        /* ------------------------------------------------------------------ */

        const tenantResult =
          await db
            .select()
            .from(tenants)
            .where(
              eq(
                tenants.id,
                input.tenantId,
              ),
            )
            .limit(1);

        const tenant =
          tenantResult[0];

        if (!tenant) {
          throw new TRPCError({
            code:
              "NOT_FOUND",
            message:
              "Tenant record not found.",
          });
        }

        if (
          tenant.orgId &&
          tenant.orgId !==
            ctx.user.orgId
        ) {
          throw new TRPCError({
            code:
              "FORBIDDEN",
            message:
              "You cannot invite a tenant from another organization.",
          });
        }

        /* ------------------------------------------------------------------ */
        /* Check existing user                                                */
        /* ------------------------------------------------------------------ */

        const existingResult =
          await db
            .select({
              id:
                users.id,
              inviteUsed:
                users.inviteUsed,
              role:
                users.role,
              orgId:
                users.orgId,
            })
            .from(users)
            .where(
              eq(
                users.email,
                normalizedEmail,
              ),
            )
            .limit(1);

        const existing =
          existingResult[0];

        if (
          existing &&
          existing.inviteUsed &&
          existing.role ===
            "tenant"
        ) {
          throw new TRPCError({
            code:
              "CONFLICT",
            message:
              "A tenant account with this email already exists and is active.",
          });
        }

        /* ------------------------------------------------------------------ */
        /* Generate invitation                                                */
        /* ------------------------------------------------------------------ */

        const inviteToken =
          nanoid(48);

        const inviteTokenExpiry =
          new Date(
            Date.now() +
              INVITE_EXPIRY_HOURS *
                60 *
                60 *
                1000,
          );

        let userId:
          number;

        /* ------------------------------------------------------------------ */
        /* Update existing pending account                                    */
        /* ------------------------------------------------------------------ */

        if (existing) {
          await db
            .update(users)
            .set({
              name:
                input.name.trim(),
              email:
                normalizedEmail,
              role:
                "tenant",
              loginMethod:
                "invite",
              orgId:
                ctx.user.orgId,
              inviteToken,
              inviteTokenExpiry,
              inviteUsed:
                0,
              inviteReminderSentAt:
                null,
            })
            .where(
              eq(
                users.id,
                existing.id,
              ),
            );

          userId =
            existing.id;
        } else {
          /* -------------------------------------------------------------- */
          /* Create pending tenant user                                      */
          /* -------------------------------------------------------------- */

          const openId =
            `tenant_${nanoid(24)}`;

          try {
            await db
              .insert(users)
              .values({
                openId,
                name:
                  input.name.trim(),
                email:
                  normalizedEmail,
                loginMethod:
                  "invite",
                role:
                  "tenant",
                orgId:
                  ctx.user.orgId,
                inviteToken,
                inviteTokenExpiry,
                inviteUsed:
                  0,
                lastSignedIn:
                  new Date(),
                inviteReminderSentAt:
                  null,
              });
          } catch (error) {
            console.error(
              "[Auth] Failed to create tenant user:",
              error,
            );

            throw new TRPCError({
              code:
                "INTERNAL_SERVER_ERROR",
              message:
                "Failed to create tenant account.",
            });
          }

          /* -------------------------------------------------------------- */
          /* Retrieve newly created user                                    */
          /* -------------------------------------------------------------- */

          const createdTenantUserResult =
            await db
              .select({
                id:
                  users.id,
              })
              .from(users)
              .where(
                eq(
                  users.openId,
                  openId,
                ),
              )
              .limit(1);

          const createdTenantUser =
            createdTenantUserResult[0];

          if (!createdTenantUser) {
            throw new TRPCError({
              code:
                "INTERNAL_SERVER_ERROR",
              message:
                "Tenant account was created but could not be retrieved.",
            });
          }

          userId =
            createdTenantUser.id;
        }

        /* ------------------------------------------------------------------ */
        /* Link user to tenant                                                */
        /* ------------------------------------------------------------------ */

        await db
          .update(tenants)
          .set({
            userId,
          })
          .where(
            eq(
              tenants.id,
              input.tenantId,
            ),
          );

        /* ------------------------------------------------------------------ */
        /* Build invite URL                                                   */
        /* ------------------------------------------------------------------ */

        const baseUrl =
          getBaseUrl(
            input.origin,
          );

        const inviteUrl =
          `${baseUrl}/accept-invite?token=${encodeURIComponent(
            inviteToken,
          )}`;

        /* ------------------------------------------------------------------ */
        /* Send invitation                                                    */
        /* ------------------------------------------------------------------ */

        const emailResult =
          await sendInviteEmail({
            to:
              normalizedEmail,
            tenantName:
              input.name,
            inviteUrl,
            expiresHours:
              INVITE_EXPIRY_HOURS,
            managerName:
              ctx.user.name ??
              "Your Property Manager",
          });

        return {
          success:
            true,
          inviteToken,
          inviteLink:
            `/accept-invite?token=${encodeURIComponent(
              inviteToken,
            )}`,
          inviteUrl,
          expiresAt:
            inviteTokenExpiry.toISOString(),
          emailSent:
            emailResult.success,
          emailError:
            emailResult.error,
        };
      },
    ),

  /* ======================================================================== */
  /* VALIDATE INVITE                                                          */
  /* ======================================================================== */

  validateInvite: publicProcedure
    .input(
      z.object({
        token:
          z.string().min(1),
      }),
    )
    .query(
      async ({
        input,
      }) => {
        const db =
          await getDb();

        if (!db) {
          throw new TRPCError({
            code:
              "INTERNAL_SERVER_ERROR",
            message:
              "Database unavailable.",
          });
        }

        const result =
          await db
            .select({
              id:
                users.id,
              name:
                users.name,
              email:
                users.email,
              inviteTokenExpiry:
                users.inviteTokenExpiry,
              inviteUsed:
                users.inviteUsed,
              role:
                users.role,
            })
            .from(users)
            .where(
              eq(
                users.inviteToken,
                input.token,
              ),
            )
            .limit(1);

        const user =
          result[0];

        if (!user) {
          return {
            valid: false,
            reason:
              "Invite link not found or already used.",
          };
        }

        if (user.inviteUsed) {
          return {
            valid: false,
            reason:
              "This invite link has already been used.",
          };
        }

        if (
          user.inviteTokenExpiry &&
          new Date() >
            user.inviteTokenExpiry
        ) {
          return {
            valid: false,
            reason:
              "This invite link has expired. Please ask your property manager for a new one.",
          };
        }

        return {
          valid: true,
          name:
            user.name,
          email:
            user.email,
        };
      },
    ),

  /* ======================================================================== */
  /* ACCEPT INVITE                                                            */
  /* ======================================================================== */

  acceptInvite: publicProcedure
    .input(
      z.object({
        token:
          z.string().min(1),

        password:
          z.string()
            .min(8)
            .max(128),

        name:
          z.string()
            .trim()
            .min(1)
            .max(100)
            .optional(),
      }),
    )
    .mutation(
      async ({
        input,
        ctx,
      }) => {
        const db =
          await getDb();

        if (!db) {
          throw new TRPCError({
            code:
              "INTERNAL_SERVER_ERROR",
            message:
              "Database unavailable.",
          });
        }

        const result =
          await db
            .select()
            .from(users)
            .where(
              eq(
                users.inviteToken,
                input.token,
              ),
            )
            .limit(1);

        const user =
          result[0];

        if (!user) {
          throw new TRPCError({
            code:
              "NOT_FOUND",
            message:
              "Invite not found.",
          });
        }

        if (user.inviteUsed) {
          throw new TRPCError({
            code:
              "BAD_REQUEST",
            message:
              "Invite already used.",
          });
        }

        if (
          user.inviteTokenExpiry &&
          new Date() >
            user.inviteTokenExpiry
        ) {
          throw new TRPCError({
            code:
              "BAD_REQUEST",
            message:
              "Invite has expired.",
          });
        }

        const passwordHash =
          await bcrypt.hash(
            input.password,
            SALT_ROUNDS,
          );

        const updatedName =
          input.name?.trim() ||
          user.name ||
          user.email ||
          "Tenant";

        /* ------------------------------------------------------------------ */
        /* Activate account                                                   */
        /* ------------------------------------------------------------------ */

        await db
          .update(users)
          .set({
            passwordHash,
            name:
              updatedName,
            loginMethod:
              "email",
            inviteUsed:
              1,
            inviteToken:
              null,
            inviteTokenExpiry:
              null,
            inviteReminderSentAt:
              null,
            lastSignedIn:
              new Date(),
          })
          .where(
            eq(
              users.id,
              user.id,
            ),
          );

        /* ------------------------------------------------------------------ */
        /* Retrieve updated user                                              */
        /* ------------------------------------------------------------------ */

        const updatedResult =
          await db
            .select()
            .from(users)
            .where(
              eq(
                users.id,
                user.id,
              ),
            )
            .limit(1);

        const updatedUser =
          updatedResult[0];

        if (!updatedUser) {
          throw new TRPCError({
            code:
              "INTERNAL_SERVER_ERROR",
            message:
              "Failed to activate account.",
          });
        }

        /* ------------------------------------------------------------------ */
        /* Create session                                                     */
        /* ------------------------------------------------------------------ */

        try {
          const sessionToken =
            await createSessionCookie(
              updatedUser.openId,
              updatedUser.name ??
                updatedUser.email ??
                "Tenant",
              ctx.req,
              ctx.res,
            );

          return {
            success:
              true,
            user:
              sanitizeUser(
                updatedUser,
              ),
            sessionToken,
          };
        } catch (error) {
          console.error(
            "[Auth] Failed to create tenant session:",
            error,
          );

          throw new TRPCError({
            code:
              "INTERNAL_SERVER_ERROR",
            message:
              "Account was activated, but the login session could not be created.",
          });
        }
      },
    ),

  /* ======================================================================== */
  /* FORGOT PASSWORD                                                          */
  /* ======================================================================== */

  forgotPassword: publicProcedure
    .input(
      z.object({
        email:
          z.string().email(),

        origin:
          z.string()
            .url()
            .optional(),
      }),
    )
    .mutation(
      async ({
        input,
        ctx,
      }) => {
        const forwardedFor =
          ctx.req.headers[
            "x-forwarded-for"
          ];

        const ip =
          typeof forwardedFor ===
          "string"
            ? forwardedFor
                .split(",")[0]
                .trim()
            : ctx.req.socket
                ?.remoteAddress ??
              "unknown";

        const normalizedEmail =
          normalizeEmail(
            input.email,
          );

        /* ------------------------------------------------------------------ */
        /* IP rate limit                                                      */
        /* ------------------------------------------------------------------ */

        if (
          !forgotPasswordIpLimiter.check(
            ip,
          )
        ) {
          const retryAfter =
            forgotPasswordIpLimiter.retryAfterSeconds(
              ip,
            );

          throw new TRPCError({
            code:
              "TOO_MANY_REQUESTS",
            message:
              `Too many requests from this IP. Please try again in ${Math.ceil(
                retryAfter / 60,
              )} minute(s).`,
          });
        }

        /* ------------------------------------------------------------------ */
        /* Email rate limit                                                    */
        /* ------------------------------------------------------------------ */

        if (
          !forgotPasswordEmailLimiter.check(
            normalizedEmail,
          )
        ) {
          return {
            success:
              true,
          };
        }

        const db =
          await getDb();

        if (!db) {
          return {
            success:
              true,
          };
        }

        /* ------------------------------------------------------------------ */
        /* Find account                                                        */
        /* ------------------------------------------------------------------ */

        const result =
          await db
            .select()
            .from(users)
            .where(
              eq(
                users.email,
                normalizedEmail,
              ),
            )
            .limit(1);

        const user =
          result[0];

        if (!user) {
          return {
            success:
              true,
          };
        }

        /* ------------------------------------------------------------------ */
        /* Create reset token                                                  */
        /* ------------------------------------------------------------------ */

        const token =
          nanoid(48);

        const expiry =
          new Date(
            Date.now() +
              RESET_PASSWORD_EXPIRY_HOURS *
                60 *
                60 *
                1000,
          );

        await db
          .update(users)
          .set({
            resetToken:
              token,
            resetTokenExpiry:
              expiry,
          })
          .where(
            eq(
              users.id,
              user.id,
            ),
          );

        /* ------------------------------------------------------------------ */
        /* Build reset URL                                                     */
        /* ------------------------------------------------------------------ */

        const baseUrl =
          getBaseUrl(
            input.origin,
          );

        const resetUrl =
          `${baseUrl}/reset-password?token=${encodeURIComponent(
            token,
          )}`;

        /* ------------------------------------------------------------------ */
        /* Send reset email                                                    */
        /* ------------------------------------------------------------------ */

        try {
          await sendPasswordResetEmail({
            to:
              user.email as string,
            name:
              user.name ??
              (user.email as string),
            resetUrl,
          });
        } catch (error) {
          console.error(
            "[Auth] Failed to send password reset email:",
            error,
          );
        }

        return {
          success:
            true,
        };
      },
    ),

  /* ======================================================================== */
  /* VALIDATE RESET TOKEN                                                     */
  /* ======================================================================== */

  validateResetToken: publicProcedure
    .input(
      z.object({
        token:
          z.string().min(1),
      }),
    )
    .query(
      async ({
        input,
      }) => {
        const db =
          await getDb();

        if (!db) {
          throw new TRPCError({
            code:
              "INTERNAL_SERVER_ERROR",
            message:
              "Database unavailable.",
          });
        }

        const result =
          await db
            .select()
            .from(users)
            .where(
              eq(
                users.resetToken,
                input.token,
              ),
            )
            .limit(1);

        const user =
          result[0];

        if (
          !user ||
          !user.resetTokenExpiry
        ) {
          throw new TRPCError({
            code:
              "NOT_FOUND",
            message:
              "Invalid or expired reset link.",
          });
        }

        if (
          new Date() >
          new Date(
            user.resetTokenExpiry,
          )
        ) {
          throw new TRPCError({
            code:
              "BAD_REQUEST",
            message:
              "This reset link has expired. Please request a new one.",
          });
        }

        return {
          valid:
            true,
          email:
            user.email,
        };
      },
    ),

  /* ======================================================================== */
  /* RESET PASSWORD                                                           */
  /* ======================================================================== */

  resetPassword: publicProcedure
    .input(
      z.object({
        token:
          z.string().min(1),

        newPassword:
          z.string()
            .min(8)
            .max(128),
      }),
    )
    .mutation(
      async ({
        input,
      }) => {
        const db =
          await getDb();

        if (!db) {
          throw new TRPCError({
            code:
              "INTERNAL_SERVER_ERROR",
            message:
              "Database unavailable.",
          });
        }

        const result =
          await db
            .select()
            .from(users)
            .where(
              eq(
                users.resetToken,
                input.token,
              ),
            )
            .limit(1);

        const user =
          result[0];

        if (
          !user ||
          !user.resetTokenExpiry
        ) {
          throw new TRPCError({
            code:
              "NOT_FOUND",
            message:
              "Invalid or expired reset link.",
          });
        }

        if (
          new Date() >
          new Date(
            user.resetTokenExpiry,
          )
        ) {
          throw new TRPCError({
            code:
              "BAD_REQUEST",
            message:
              "This reset link has expired. Please request a new one.",
          });
        }

        const newHash =
          await bcrypt.hash(
            input.newPassword,
            SALT_ROUNDS,
          );

        await db
          .update(users)
          .set({
            passwordHash:
              newHash,
            resetToken:
              null,
            resetTokenExpiry:
              null,
            lastSignedIn:
              new Date(),
          })
          .where(
            eq(
              users.id,
              user.id,
            ),
          );

        return {
          success:
            true,
        };
      },
    ),

  /* ======================================================================== */
  /* CHANGE PASSWORD                                                          */
  /* ======================================================================== */

  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword:
          z.string().min(1),

        newPassword:
          z.string()
            .min(8)
            .max(128),
      }),
    )
    .mutation(
      async ({
        input,
        ctx,
      }) => {
        const db =
          await getDb();

        if (!db) {
          throw new TRPCError({
            code:
              "INTERNAL_SERVER_ERROR",
            message:
              "Database unavailable.",
          });
        }

        const result =
          await db
            .select()
            .from(users)
            .where(
              eq(
                users.id,
                ctx.user.id,
              ),
            )
            .limit(1);

        const user =
          result[0];

        if (
          !user ||
          !user.passwordHash
        ) {
          throw new TRPCError({
            code:
              "BAD_REQUEST",
            message:
              "No password is set on this account.",
          });
        }

        const valid =
          await bcrypt.compare(
            input.currentPassword,
            user.passwordHash,
          );

        if (!valid) {
          throw new TRPCError({
            code:
              "UNAUTHORIZED",
            message:
              "Current password is incorrect.",
          });
        }

        const newHash =
          await bcrypt.hash(
            input.newPassword,
            SALT_ROUNDS,
          );

        await db
          .update(users)
          .set({
            passwordHash:
              newHash,
          })
          .where(
            eq(
              users.id,
              user.id,
            ),
          );

        return {
          success:
            true,
        };
      },
    ),
});
