import { z } from "zod";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { getDb } from "./db";
import { storagePut } from "./storage";
import { ENV } from "./_core/env";
import { getShareExpiry, SHARE_DURATION_HOURS, type ShareDurationHours } from "./documentShare";
import { v2Routers } from "./routers2";
import { authRouter } from "./authRouter";
import { organizations, users } from "../drizzle/schema";
import { sendStaffInviteEmail } from "./email";
import { nanoid } from "nanoid";
import { THEME_PALETTE_IDS } from "../shared/themePalettes";

// ─── Middleware ───────────────────────────────────────────────────────────────
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

const tenantOrAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "tenant") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
  }
  return next({ ctx });
});

// ─── Owners Router ────────────────────────────────────────────────────────────
const ownersRouter = router({
  list: adminProcedure.query(({ ctx }) => db.getOwners(ctx.user.orgId ?? undefined)),

  byId: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => db.getOwnerById(input.id)),

  create: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      email: z.string().optional(),
      phone: z.string().optional(),
      company: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zip: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(({ input, ctx }) => db.createOwner({ ...input, orgId: ctx.user.orgId ?? undefined })),

  update: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      company: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zip: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(({ input }) => {
      const { id, ...data } = input;
      return db.updateOwner(id, data);
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => db.deleteOwner(input.id)),
});

// ─── Properties Router ────────────────────────────────────────────────────────
const propertiesRouter = router({
  list: adminProcedure
    .input(z.object({ ownerId: z.number().optional() }).optional())
    .query(({ input, ctx }) => db.getProperties(input?.ownerId, ctx.user.orgId ?? undefined)),

  byId: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => db.getPropertyById(input.id)),

  create: adminProcedure
    .input(z.object({
      ownerId: z.number().optional(),
      name: z.string().min(1),
      address: z.string().min(1),
      city: z.string().min(1),
      state: z.string().min(1),
      zip: z.string().min(1),
      country: z.string().optional(),
      type: z.enum(["residential", "commercial", "mixed", "industrial"]).optional(),
      description: z.string().optional(),
      yearBuilt: z.number().optional(),
      totalUnits: z.number().optional(),
      imageUrl: z.string().optional(),
    }))
    .mutation(({ input, ctx }) => db.createProperty({ ...input, orgId: ctx.user.orgId ?? undefined })),

  update: adminProcedure
    .input(z.object({
      id: z.number(),
      ownerId: z.number().optional(),
      name: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zip: z.string().optional(),
      country: z.string().optional(),
      type: z.enum(["residential", "commercial", "mixed", "industrial"]).optional(),
      description: z.string().optional(),
      yearBuilt: z.number().optional(),
      totalUnits: z.number().optional(),
      imageUrl: z.string().optional(),
    }))
    .mutation(({ input }) => {
      const { id, ...data } = input;
      return db.updateProperty(id, data);
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => db.deleteProperty(input.id)),
});

// ─── Units Router ─────────────────────────────────────────────────────────────
const unitsRouter = router({
  byProperty: adminProcedure
    .input(z.object({ propertyId: z.number() }))
    .query(({ input }) => db.getUnitsByProperty(input.propertyId)),

  all: adminProcedure.query(() => db.getAllUnits()),

  byId: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => db.getUnitById(input.id)),

  create: adminProcedure
    .input(z.object({
      propertyId: z.number(),
      unitNumber: z.string().min(1),
      type: z.enum(["studio", "1br", "2br", "3br", "4br+", "commercial"]).optional(),
      bedrooms: z.number().optional(),
      bathrooms: z.string().optional(),
      sqft: z.union([z.number(), z.nan()]).optional().transform(v => (v !== undefined && isNaN(v as number) ? undefined : v as number | undefined)),
      floor: z.union([z.number(), z.nan()]).optional().transform(v => (v !== undefined && isNaN(v as number) ? undefined : v as number | undefined)),
      rentAmount: z.string(),
      depositAmount: z.string().optional(),
      status: z.enum(["vacant", "occupied", "maintenance", "unavailable"]).optional(),
      amenities: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(({ input }) => db.createUnit(input)),

  update: adminProcedure
    .input(z.object({
      id: z.number(),
      unitNumber: z.string().optional(),
      type: z.enum(["studio", "1br", "2br", "3br", "4br+", "commercial"]).optional(),
      bedrooms: z.number().optional(),
      bathrooms: z.string().optional(),
      sqft: z.union([z.number(), z.nan()]).optional().transform(v => (v !== undefined && isNaN(v as number) ? undefined : v as number | undefined)),
      floor: z.union([z.number(), z.nan()]).optional().transform(v => (v !== undefined && isNaN(v as number) ? undefined : v as number | undefined)),
      rentAmount: z.string().optional(),
      depositAmount: z.string().optional(),
      status: z.enum(["vacant", "occupied", "maintenance", "unavailable"]).optional(),
      amenities: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(({ input }) => {
      const { id, ...data } = input;
      return db.updateUnit(id, data);
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => db.deleteUnit(input.id)),
});

// ─── Tenants Router ───────────────────────────────────────────────────────────
const tenantsRouter = router({
  list: adminProcedure.query(({ ctx }) => db.getTenants(ctx.user.orgId ?? undefined)),

  byId: tenantOrAdminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const tenant = await db.getTenantById(input.id);
      if (!tenant) throw new TRPCError({ code: "NOT_FOUND" });
      // Tenants can only view their own profile
      if (ctx.user.role === "tenant") {
        const myTenant = await db.getTenantByUserId(ctx.user.id);
        if (!myTenant || myTenant.id !== input.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }
      return tenant;
    }),

  myProfile: protectedProcedure.query(async ({ ctx }) => {
    return db.getTenantByUserId(ctx.user.id);
  }),

  create: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      email: z.string().email(),
      phone: z.string().optional(),
      emergencyContactName: z.string().optional(),
      emergencyContactPhone: z.string().optional(),
      emergencyContactRelation: z.string().optional(),
      employerName: z.string().optional(),
      monthlyIncome: z.string().optional(),
      notes: z.string().optional(),
      status: z.enum(["active", "inactive", "evicted"]).optional(),
    }))
    .mutation(({ input, ctx }) => db.createTenant({ ...input, orgId: ctx.user.orgId ?? undefined })),

  update: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      emergencyContactName: z.string().optional(),
      emergencyContactPhone: z.string().optional(),
      emergencyContactRelation: z.string().optional(),
      employerName: z.string().optional(),
      monthlyIncome: z.string().optional(),
      notes: z.string().optional(),
      status: z.enum(["active", "inactive", "evicted"]).optional(),
    }))
    .mutation(({ input }) => {
      const { id, ...data } = input;
      return db.updateTenant(id, data);
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => db.deleteTenant(input.id)),
});

// ─── Leases Router ────────────────────────────────────────────────────────────
const leasesRouter = router({
  list: adminProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(({ input, ctx }) => db.getLeases(input?.status, ctx.user.orgId ?? undefined)),

  byId: tenantOrAdminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const lease = await db.getLeaseById(input.id);
      if (!lease) throw new TRPCError({ code: "NOT_FOUND" });
      if (ctx.user.role === "tenant") {
        const myTenant = await db.getTenantByUserId(ctx.user.id);
        if (!myTenant || myTenant.id !== lease.tenantId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }
      return lease;
    }),

  byTenant: tenantOrAdminProcedure
    .input(z.object({ tenantId: z.number() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role === "tenant") {
        const myTenant = await db.getTenantByUserId(ctx.user.id);
        if (!myTenant || myTenant.id !== input.tenantId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }
      return db.getLeasesByTenant(input.tenantId);
    }),

  byUnit: adminProcedure
    .input(z.object({ unitId: z.number() }))
    .query(({ input }) => db.getLeasesByUnit(input.unitId)),

  myLeases: protectedProcedure.query(async ({ ctx }) => {
    const tenant = await db.getTenantByUserId(ctx.user.id);
    if (!tenant) return [];
    return db.getLeasesByTenant(tenant.id);
  }),

  create: adminProcedure
    .input(z.object({
      unitId: z.number(),
      tenantId: z.number(),
      startDate: z.string(),
      endDate: z.string(),
      rentAmount: z.string(),
      depositAmount: z.string(),
      depositPaid: z.boolean().optional(),
      paymentDueDay: z.number().optional(),
      lateFeeAmount: z.string().optional(),
      lateFeeGraceDays: z.number().optional(),
      status: z.enum(["pending", "active", "expired", "terminated"]).optional(),
      terms: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      await db.createLease({
        ...input,
        startDate: new Date(input.startDate) as any,
        endDate: new Date(input.endDate) as any,
      });
      if (input.status === "active") {
        await db.updateUnit(input.unitId, { status: "occupied" });
      }
    }),

  update: adminProcedure
    .input(z.object({
      id: z.number(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      rentAmount: z.string().optional(),
      depositAmount: z.string().optional(),
      depositPaid: z.boolean().optional(),
      paymentDueDay: z.number().optional(),
      lateFeeAmount: z.string().optional(),
      lateFeeGraceDays: z.number().optional(),
      status: z.enum(["pending", "active", "expired", "terminated"]).optional(),
      terms: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const lease = await db.getLeaseById(id);
      if (lease && data.status) {
        if (data.status === "active") {
          await db.updateUnit(lease.unitId, { status: "occupied" });
        } else if (data.status === "expired" || data.status === "terminated") {
          await db.updateUnit(lease.unitId, { status: "vacant" });
        }
      }
      const leaseUpdate: any = { ...data };
      if (data.startDate) leaseUpdate.startDate = new Date(data.startDate);
      if (data.endDate) leaseUpdate.endDate = new Date(data.endDate);
      return db.updateLease(id, leaseUpdate);
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => db.deleteLease(input.id)),
});

// ─── Rent Payments Router ─────────────────────────────────────────────────────
const rentPaymentsRouter = router({
  list: adminProcedure
    .input(z.object({
      tenantId: z.number().optional(),
      leaseId: z.number().optional(),
      status: z.string().optional(),
    }).optional())
    .query(({ input }) => db.getRentPayments(input)),

  byId: tenantOrAdminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const payment = await db.getRentPaymentById(input.id);
      if (!payment) throw new TRPCError({ code: "NOT_FOUND" });
      if (ctx.user.role === "tenant") {
        const myTenant = await db.getTenantByUserId(ctx.user.id);
        if (!myTenant || myTenant.id !== payment.tenantId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }
      return payment;
    }),

  myPayments: protectedProcedure.query(async ({ ctx }) => {
    const tenant = await db.getTenantByUserId(ctx.user.id);
    if (!tenant) return [];
    return db.getRentPayments({ tenantId: tenant.id });
  }),

  create: adminProcedure
    .input(z.object({
      leaseId: z.number(),
      tenantId: z.number(),
      amount: z.string(),
      lateFee: z.string().optional(),
      totalAmount: z.string(),
      dueDate: z.string(),
      paidDate: z.string().optional(),
      status: z.enum(["pending", "paid", "overdue", "partial", "waived"]).optional(),
      paymentMethod: z.enum(["ach", "credit_card", "check", "cash", "other"]).optional(),
      notes: z.string().optional(),
    }))
    .mutation(({ input }) => db.createRentPayment({
      ...input,
      dueDate: new Date(input.dueDate) as any,
      paidDate: input.paidDate ? new Date(input.paidDate) as any : undefined,
    })),

  markPaid: adminProcedure
    .input(z.object({
      id: z.number(),
      paidDate: z.string(),
      paymentMethod: z.enum(["ach", "credit_card", "check", "cash", "other"]).optional(),
      notes: z.string().optional(),
    }))
    .mutation(({ input }) => {
      const { id, paidDate, ...rest } = input;
      return db.updateRentPayment(id, { ...rest, status: "paid", paidDate: new Date(paidDate) as any });
    }),

  applyLateFee: adminProcedure
    .input(z.object({ id: z.number(), lateFee: z.string() }))
    .mutation(async ({ input }) => {
      const payment = await db.getRentPaymentById(input.id);
      if (!payment) throw new TRPCError({ code: "NOT_FOUND" });
      const newTotal = (Number(payment.amount) + Number(input.lateFee)).toFixed(2);
      return db.updateRentPayment(input.id, {
        lateFee: input.lateFee,
        totalAmount: newTotal,
        status: "overdue",
      });
    }),

  update: adminProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["pending", "paid", "overdue", "partial", "waived"]).optional(),
      paidDate: z.string().optional(),
      paymentMethod: z.enum(["ach", "credit_card", "check", "cash", "other"]).optional(),
      notes: z.string().optional(),
    }))
    .mutation(({ input }) => {
      const { id, paidDate, ...rest } = input;
      const data: any = { ...rest };
      if (paidDate) data.paidDate = new Date(paidDate);
      return db.updateRentPayment(id, data);
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => db.deleteRentPayment(input.id)),
});

// ─── Maintenance Router ───────────────────────────────────────────────────────
const maintenanceRouter = router({
  list: adminProcedure
    .input(z.object({
      unitId: z.number().optional(),
      tenantId: z.number().optional(),
      status: z.string().optional(),
      priority: z.string().optional(),
    }).optional())
    .query(({ input }) => db.getMaintenanceRequests(input)),

  byId: tenantOrAdminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const req = await db.getMaintenanceRequestById(input.id);
      if (!req) throw new TRPCError({ code: "NOT_FOUND" });
      if (ctx.user.role === "tenant") {
        const myTenant = await db.getTenantByUserId(ctx.user.id);
        if (!myTenant || myTenant.id !== req.tenantId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }
      return req;
    }),

  myRequests: protectedProcedure.query(async ({ ctx }) => {
    const tenant = await db.getTenantByUserId(ctx.user.id);
    if (!tenant) return [];
    return db.getMaintenanceRequests({ tenantId: tenant.id });
  }),

  create: tenantOrAdminProcedure
    .input(z.object({
      unitId: z.number(),
      tenantId: z.number().optional(),
      title: z.string().min(1),
      description: z.string().min(1),
      category: z.enum(["plumbing", "electrical", "hvac", "appliance", "structural", "pest", "cleaning", "other"]).optional(),
      priority: z.enum(["urgent", "high", "medium", "low"]).optional(),
      imageUrl: z.string().optional(),
      imageUrls: z.array(z.string()).max(5).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      let tenantId = input.tenantId;
      if (ctx.user.role === "tenant") {
        const myTenant = await db.getTenantByUserId(ctx.user.id);
        tenantId = myTenant?.id;
      }
      const { imageUrls, ...rest } = input;
      const imageUrlsJson = imageUrls && imageUrls.length > 0 ? JSON.stringify(imageUrls) : undefined;
      return db.createMaintenanceRequest({ ...rest, tenantId, imageUrls: imageUrlsJson });
    }),

  update: adminProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["open", "in_progress", "on_hold", "resolved", "cancelled"]).optional(),
      priority: z.enum(["urgent", "high", "medium", "low"]).optional(),
      assignedTo: z.string().optional(),
      estimatedCost: z.string().optional(),
      actualCost: z.string().optional(),
      scheduledDate: z.string().optional(),
      notes: z.string().optional(),
      adminImageUrls: z.array(z.string()).max(10).optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, adminImageUrls, ...data } = input;
      const updates: any = { ...data };
      if (data.status === "resolved") {
        updates.resolvedAt = new Date();
      }
      if (adminImageUrls !== undefined) {
        // Merge with existing admin photos rather than overwriting
        const existing = await db.getMaintenanceRequestById(id);
        const existingUrls: string[] = existing?.parsedAdminImageUrls ?? [];
        const merged = [...existingUrls, ...adminImageUrls];
        updates.adminImageUrls = JSON.stringify(merged);
      }
      return db.updateMaintenanceRequest(id, updates);
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => db.deleteMaintenanceRequest(input.id)),
});

// ─── Expenses Router ──────────────────────────────────────────────────────────
const expensesRouter = router({
  list: adminProcedure
    .input(z.object({ propertyId: z.number().optional() }).optional())
    .query(({ input }) => db.getExpenses(input?.propertyId)),

  byId: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => db.getExpenseById(input.id)),

  create: adminProcedure
    .input(z.object({
      propertyId: z.number(),
      unitId: z.number().optional(),
      category: z.enum(["mortgage", "insurance", "taxes", "utilities", "maintenance", "management", "landscaping", "advertising", "legal", "supplies", "other"]).optional(),
      amount: z.string(),
      date: z.string(),
      description: z.string().min(1),
      vendor: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(({ input }) => db.createExpense({ ...input, date: new Date(input.date) as any })),

  update: adminProcedure
    .input(z.object({
      id: z.number(),
      category: z.enum(["mortgage", "insurance", "taxes", "utilities", "maintenance", "management", "landscaping", "advertising", "legal", "supplies", "other"]).optional(),
      amount: z.string().optional(),
      date: z.string().optional(),
      description: z.string().optional(),
      vendor: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(({ input }) => {
      const { id, date, ...rest } = input;
      const data: any = { ...rest };
      if (date) data.date = new Date(date);
      return db.updateExpense(id, data);
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => db.deleteExpense(input.id)),
});

// ─── Documents Router ─────────────────────────────────────────────────────────
const MAX_DOCUMENT_SIZE = 16 * 1024 * 1024;
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
const documentCategorySchema = z.enum(["lease", "addendum", "notice", "inspection", "insurance", "tax", "maintenance", "other"]);

const documentsRouter = router({
  list: adminProcedure
    .input(z.object({
      entityType: z.enum(["property", "unit", "tenant", "lease", "expense"]),
      entityId: z.number(),
    }))
    .query(({ input }) => db.getDocuments(input.entityType, input.entityId)),

  all: adminProcedure.query(() => db.getAllDocuments()),

  upload: tenantOrAdminProcedure
    .input(z.object({
      entityType: z.enum(["property", "unit", "tenant", "lease", "expense"]),
      entityId: z.number().int().positive(),
      name: z.string().trim().min(1).max(255),
      category: documentCategorySchema.default("other"),
      fileName: z.string().trim().min(1).max(255),
      fileData: z.string().min(4), // base64
      mimeType: z.string(),
      fileSize: z.number().int().positive().max(MAX_DOCUMENT_SIZE),
      propertyId: z.number().int().positive().optional(),
      tenantId: z.number().int().positive().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const buffer = Buffer.from(input.fileData, "base64");
      if (!buffer.length || buffer.length > MAX_DOCUMENT_SIZE) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Document files must be between 1 byte and 16 MB" });
      }

      const ext = input.fileName.split(".").pop()?.toLowerCase() ?? "";
      const normalizedMimeType = DOCUMENT_MIME_BY_EXTENSION[ext];
      if (!normalizedMimeType) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Unsupported document type" });
      }

      const key = `documents/${input.entityType}/${input.entityId}/${Date.now()}.${ext}`;
      const { url, key: storedKey } = await storagePut(key, buffer, normalizedMimeType);
      await db.createDocument({
        entityType: input.entityType,
        entityId: input.entityId,
        propertyId: input.propertyId ?? (input.entityType === "property" ? input.entityId : undefined),
        tenantId: input.tenantId,
        name: input.name,
        category: input.category,
        fileName: input.fileName,
        fileKey: storedKey,
        fileUrl: url,
        mimeType: normalizedMimeType,
        fileSize: buffer.length,
        uploadedBy: ctx.user.id,
      });
      return { url, key: storedKey };
    }),

  createShareLink: adminProcedure
    .input(z.object({
      id: z.number().int().positive(),
      durationHours: z.union([z.literal(24), z.literal(72), z.literal(168), z.literal(720)]),
      origin: z.string().url().optional(),
    }))
    .mutation(async ({ input }) => {
      const document = await db.getDocumentById(input.id);
      if (!document) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      const expiresAt = getShareExpiry(input.durationHours as ShareDurationHours);
      const token = nanoid(32);
      await db.setDocumentShare(document.id, token, expiresAt);
      const baseUrl = (input.origin || ENV.appBaseUrl).replace(/\/$/, "");
      return { shareUrl: `${baseUrl}/share/doc/${token}`, expiresAt };
    }),

  revokeShareLink: adminProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await db.setDocumentShare(input.id, null, null);
      return { success: true };
    }),

  myDocuments: protectedProcedure.query(async ({ ctx }) => {
    const tenant = await db.getTenantByUserId(ctx.user.id);
    if (!tenant) return [];
    return db.getDocumentsByTenant(tenant.id);
  }),
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => db.deleteDocument(input.id)),
});

// ─── Dashboard Router ─────────────────────────────────────────────────────────
const dashboardRouter = router({
  metrics: adminProcedure.query(({ ctx }) => db.getDashboardMetrics(ctx.user.orgId ?? undefined)),
  financialSummary: adminProcedure
    .input(z.object({ propertyId: z.number().optional(), year: z.number().optional() }).optional())
    .query(({ input }) => db.getFinancialSummary(input?.propertyId, input?.year)),
  monthlyFinancials: adminProcedure
    .input(z.object({ year: z.number().optional() }).optional())
    .query(({ input }) => db.getMonthlyFinancials(input?.year ?? new Date().getFullYear())),
  recentPayments: adminProcedure.query(() => db.getRentPayments()),
  recentMaintenance: adminProcedure.query(() => db.getMaintenanceRequests()),
});

// ─── Accounting Router ────────────────────────────────────────────────────────
const accountingRouter = router({
  summary: adminProcedure
    .input(z.object({ propertyId: z.number().optional(), year: z.number().optional() }).optional())
    .query(({ input }) => db.getFinancialSummary(input?.propertyId, input?.year)),
  monthly: adminProcedure
    .input(z.object({ year: z.number().optional() }).optional())
    .query(({ input }) => db.getMonthlyFinancials(input?.year ?? new Date().getFullYear())),
  expenses: adminProcedure
    .input(z.object({ propertyId: z.number().optional() }).optional())
    .query(({ input }) => db.getExpenses(input?.propertyId)),
  income: adminProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(({ input }) => db.getRentPayments(input)),
});

// ─── Org Router ─────────────────────────────────────────────────────────────
const orgRouter = router({
  /** Theme value needed by any authenticated staff dashboard route. */
  getTheme: protectedProcedure.query(async ({ ctx }) => {
    const database = await getDb();
    if (!database || !ctx.user.orgId) throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
    const result = await database
      .select({ themePalette: organizations.themePalette })
      .from(organizations)
      .where(eq(organizations.id, ctx.user.orgId))
      .limit(1);
    if (!result[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
    return result[0];
  }),

  /** Get the current org's settings (admin only) */
  getSettings: adminProcedure.query(async ({ ctx }) => {
    const database = await getDb();
    if (!database || !ctx.user.orgId) throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
    const result = await database.select().from(organizations).where(eq(organizations.id, ctx.user.orgId)).limit(1);
    if (!result[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
    return result[0];
  }),

  /** Update org name, timezone */
  updateSettings: adminProcedure
    .input(z.object({
      name: z.string().min(1).max(255).optional(),
      timezone: z.string().max(100).optional(),
      logoUrl: z.string().url().nullable().optional(),
      themePalette: z.enum(THEME_PALETTE_IDS).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database || !ctx.user.orgId) throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
      const updates: Record<string, unknown> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.timezone !== undefined) updates.timezone = input.timezone;
      if (input.logoUrl !== undefined) updates.logoUrl = input.logoUrl;
      if (input.themePalette !== undefined) updates.themePalette = input.themePalette;
      if (Object.keys(updates).length === 0) return { success: true };
      await database.update(organizations).set(updates).where(eq(organizations.id, ctx.user.orgId));
      return { success: true };
    }),
});

// ─── Team Router ─────────────────────────────────────────────────────────────
const teamRouter = router({
  /** List all members in the current org */
  list: adminProcedure.query(async ({ ctx }) => {
    const database = await getDb();
    if (!database || !ctx.user.orgId) return [];
    const members = await database
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        lastSignedIn: users.lastSignedIn,
        inviteUsed: users.inviteUsed,
        inviteToken: users.inviteToken,
      })
      .from(users)
      .where(eq(users.orgId, ctx.user.orgId))
      .orderBy(users.createdAt);
    return members.map((m) => ({
      ...m,
      status: m.inviteUsed ? "active" : m.inviteToken ? "invited" : "active",
    }));
  }),

  /** Invite a new staff member (admin or manager role) */
  invite: adminProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      email: z.string().email(),
      role: z.enum(["admin", "manager"]),
      origin: z.string().url().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database || !ctx.user.orgId) throw new TRPCError({ code: "FORBIDDEN" });
      const normalizedEmail = input.email.trim().toLowerCase();
      // Check if user already exists in this org
      const existing = await database
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);
      if (existing[0]) throw new TRPCError({ code: "CONFLICT", message: "A user with this email already exists." });
      const token = nanoid(48);
      const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      const openId = `staff_${nanoid(24)}`;
      await database.insert(users).values({
        openId,
        name: input.name,
        email: normalizedEmail,
        role: input.role,
        orgId: ctx.user.orgId,
        inviteToken: token,
        inviteTokenExpiry: expiry,
        inviteUsed: 0,
        loginMethod: "email",
        lastSignedIn: new Date(),
      });
      const baseUrl = input.origin ?? (process.env.APP_BASE_URL ?? "http://localhost:3000");
      const inviteUrl = `${baseUrl}/accept-invite?token=${token}`;
      try {
        await sendStaffInviteEmail({ to: normalizedEmail, name: input.name, inviteUrl, inviterName: ctx.user.name ?? "Your admin" });
      } catch {
        // email failure is non-fatal
      }
      return { success: true, inviteUrl };
    }),

  /** Change a member's role */
  updateRole: adminProcedure
    .input(z.object({
      userId: z.number(),
      role: z.enum(["admin", "manager"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database || !ctx.user.orgId) throw new TRPCError({ code: "FORBIDDEN" });
      // Ensure target user belongs to same org
      const target = await database
        .select({ id: users.id, orgId: users.orgId })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);
      if (!target[0] || target[0].orgId !== ctx.user.orgId) throw new TRPCError({ code: "NOT_FOUND" });
      await database.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
      return { success: true };
    }),

  /** Remove a member from the org */
  remove: adminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const database = await getDb();
      if (!database || !ctx.user.orgId) throw new TRPCError({ code: "FORBIDDEN" });
      if (input.userId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot remove yourself." });
      const target = await database
        .select({ id: users.id, orgId: users.orgId })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);
      if (!target[0] || target[0].orgId !== ctx.user.orgId) throw new TRPCError({ code: "NOT_FOUND" });
      // Nullify orgId instead of deleting to preserve audit trail
      await database.update(users).set({ orgId: null }).where(eq(users.id, input.userId));
      return { success: true };
    }),
});

// ─── App Router ───────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    register: authRouter.register,
    login: authRouter.login,
    createInvite: authRouter.createInvite,
    validateInvite: authRouter.validateInvite,
    acceptInvite: authRouter.acceptInvite,
    changePassword: authRouter.changePassword,
    forgotPassword: authRouter.forgotPassword,
    validateResetToken: authRouter.validateResetToken,
    resetPassword: authRouter.resetPassword,
  }),
  owners: ownersRouter,
  properties: propertiesRouter,
  units: unitsRouter,
  tenants: tenantsRouter,
  leases: leasesRouter,
  rentPayments: rentPaymentsRouter,
  maintenance: maintenanceRouter,
  expenses: expensesRouter,
  documents: documentsRouter,
  dashboard: dashboardRouter,
  accounting: accountingRouter,
  org: orgRouter,
  team: teamRouter,
  ...v2Routers,
});

export type AppRouter = typeof appRouter;
