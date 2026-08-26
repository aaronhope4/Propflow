import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

/**
 * orgProtectedProcedure — requires a logged-in user AND an orgId on that user.
 * Use this for all data-access procedures that must be org-scoped.
 * ctx.orgId is guaranteed to be a number when this procedure runs.
 */
export const orgProtectedProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }

    if (!ctx.user.orgId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Your account is not associated with an organization. Please contact support.",
      });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
        orgId: ctx.user.orgId,
      },
    });
  }),
);

/**
 * orgAdminProcedure — requires a logged-in admin AND an orgId.
 */
export const orgAdminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    if (!ctx.user.orgId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Your account is not associated with an organization.",
      });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
        orgId: ctx.user.orgId,
      },
    });
  }),
);
