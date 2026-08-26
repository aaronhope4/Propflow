import { z } from "zod/v4";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import * as db2 from "./db2";
import { invokeLLM } from "./_core/llm";

// ─── Middleware (re-declared locally) ───────────────────────────────────────────
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

// ═══════════════════════════════════════════════════════════════════════════════
// Vendors
// ═══════════════════════════════════════════════════════════════════════════════
const vendorsRouter = router({
  list: adminProcedure.query(({ ctx }) => {
    if (!ctx.user.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "Organization is required" });
    return db2.getVendors(ctx.user.orgId);
  }),
  byId: adminProcedure.input(z.object({ id: z.number() })).query(({ ctx, input }) => {
    if (!ctx.user.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "Organization is required" });
    return db2.getVendorById(input.id, ctx.user.orgId);
  }),
  create: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      company: z.string().min(1),
      specialties: z.string().optional(),
      preferredProvider: z.boolean().optional(),
      serviceAreas: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      category: z.enum(["plumbing", "electrical", "hvac", "general", "landscaping", "cleaning", "pest", "appliance", "roofing", "legal", "accounting", "other"]).optional(),
      address: z.string().optional(),
      taxId: z.string().optional(),
      insuranceExpiry: z.string().optional(),
      notes: z.string().optional(),
      status: z.enum(["active", "inactive"]).optional(),
    }))
    .mutation(({ ctx, input }) => {
      if (!ctx.user.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "Organization is required" });
      return db2.createVendor({ ...input, orgId: ctx.user.orgId, insuranceExpiry: input.insuranceExpiry ? new Date(input.insuranceExpiry) as any : undefined });
    }),
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      company: z.string().optional(),
      specialties: z.string().optional(),
      preferredProvider: z.boolean().optional(),
      serviceAreas: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      category: z.enum(["plumbing", "electrical", "hvac", "general", "landscaping", "cleaning", "pest", "appliance", "roofing", "legal", "accounting", "other"]).optional(),
      address: z.string().optional(),
      taxId: z.string().optional(),
      insuranceExpiry: z.string().optional(),
      notes: z.string().optional(),
      status: z.enum(["active", "inactive"]).optional(),
    }))
    .mutation(({ ctx, input }) => {
      if (!ctx.user.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "Organization is required" });
      const { id, insuranceExpiry, ...rest } = input;
      const data: any = { ...rest };
      if (insuranceExpiry) data.insuranceExpiry = new Date(insuranceExpiry);
      return db2.updateVendor(id, ctx.user.orgId, data);
    }),
  delete: adminProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => {
    if (!ctx.user.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "Organization is required" });
    return db2.deleteVendor(input.id, ctx.user.orgId);
  }),
  certificates: adminProcedure.input(z.object({ vendorId: z.number() })).query(async ({ ctx, input }) => {
    if (!ctx.user.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "Organization is required" });
    const vendor = await db2.getVendorById(input.vendorId, ctx.user.orgId);
    if (!vendor) throw new TRPCError({ code: "NOT_FOUND", message: "Vendor not found" });
    return db2.getVendorCertificates(input.vendorId, ctx.user.orgId);
  }),
  removeCertificate: adminProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => {
    if (!ctx.user.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "Organization is required" });
    return db2.deleteVendorCertificate(input.id, ctx.user.orgId);
  }),
  performanceNotes: adminProcedure.input(z.object({ vendorId: z.number() })).query(async ({ ctx, input }) => {
    if (!ctx.user.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "Organization is required" });
    const vendor = await db2.getVendorById(input.vendorId, ctx.user.orgId);
    if (!vendor) throw new TRPCError({ code: "NOT_FOUND", message: "Vendor not found" });
    return db2.getVendorPerformanceNotes(input.vendorId, ctx.user.orgId);
  }),
  addPerformanceNote: adminProcedure.input(z.object({ vendorId: z.number(), note: z.string().min(1).max(5000), rating: z.number().int().min(1).max(5).optional() })).mutation(async ({ ctx, input }) => {
    if (!ctx.user.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "Organization is required" });
    const vendor = await db2.getVendorById(input.vendorId, ctx.user.orgId);
    if (!vendor) throw new TRPCError({ code: "NOT_FOUND", message: "Vendor not found" });
    return db2.createVendorPerformanceNote({ ...input, orgId: ctx.user.orgId, authorId: ctx.user.id, authorName: ctx.user.name ?? "Administrator" });
  }),
  removePerformanceNote: adminProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => {
    if (!ctx.user.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "Organization is required" });
    return db2.deleteVendorPerformanceNote(input.id, ctx.user.orgId);
  }),
  compliance: adminProcedure.query(({ ctx }) => {
    if (!ctx.user.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "Organization is required" });
    return db2.getVendorCompliance(ctx.user.orgId);
  }),
});

// ═══════════════════════════════════════════════════════════════════════════════
// Prospects / Leasing pipeline
// ═══════════════════════════════════════════════════════════════════════════════
const prospectsRouter = router({
  list: adminProcedure.query(() => db2.getProspects()),
  byId: adminProcedure.input(z.object({ id: z.number() })).query(({ input }) => db2.getProspectById(input.id)),
  create: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      email: z.string().optional(),
      phone: z.string().optional(),
      propertyId: z.number().optional(),
      unitId: z.number().optional(),
      leadSource: z.enum(["website", "zillow", "referral", "walk_in", "phone", "social", "other"]).optional(),
      stage: z.enum(["new", "contacted", "showing", "application", "approved", "lost", "leased"]).optional(),
      notes: z.string().optional(),
    }))
    .mutation(({ input }) => db2.createProspect(input)),
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      propertyId: z.number().optional(),
      unitId: z.number().optional(),
      leadSource: z.enum(["website", "zillow", "referral", "walk_in", "phone", "social", "other"]).optional(),
      stage: z.enum(["new", "contacted", "showing", "application", "approved", "lost", "leased"]).optional(),
      notes: z.string().optional(),
    }))
    .mutation(({ input }) => {
      const { id, ...data } = input;
      return db2.updateProspect(id, data);
    }),
  delete: adminProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db2.deleteProspect(input.id)),
});

const applicationsRouter = router({
  list: adminProcedure.query(() => db2.getRentalApplications()),
  create: adminProcedure
    .input(z.object({
      prospectId: z.number().optional(),
      applicantName: z.string().min(1),
      applicantEmail: z.string().optional(),
      applicantPhone: z.string().optional(),
      propertyId: z.number().optional(),
      unitId: z.number().optional(),
      monthlyIncome: z.string().optional(),
      desiredMoveIn: z.string().optional(),
      status: z.enum(["pending", "screening", "approved", "denied", "withdrawn"]).optional(),
      notes: z.string().optional(),
    }))
    .mutation(({ input }) => db2.createRentalApplication({ ...input, desiredMoveIn: input.desiredMoveIn ? new Date(input.desiredMoveIn) as any : undefined })),
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["pending", "screening", "approved", "denied", "withdrawn"]).optional(),
      screeningScore: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(({ input }) => {
      const { id, ...data } = input;
      return db2.updateRentalApplication(id, data);
    }),
});

// ═══════════════════════════════════════════════════════════════════════════════
// Tasks & Maintenance (unified tasks)
// ═══════════════════════════════════════════════════════════════════════════════
const tasksRouter = router({
  list: adminProcedure
    .input(z.object({ type: z.string().optional(), status: z.string().optional(), propertyId: z.number().optional() }).optional())
    .query(({ input }) => db2.getTasks(input)),
  byId: adminProcedure.input(z.object({ id: z.number() })).query(({ input }) => db2.getTaskById(input.id)),
  updates: adminProcedure.input(z.object({ taskId: z.number() })).query(({ input }) => db2.getTaskUpdates(input.taskId)),
  myRequests: protectedProcedure.query(async ({ ctx }) => {
    const tenant = await db.getTenantByUserId(ctx.user.id);
    if (!tenant) return [];
    return db2.getTasks({ tenantId: tenant.id });
  }),
  create: tenantOrAdminProcedure
    .input(z.object({
      type: z.enum(["task", "tenant_request", "owner_request", "internal"]).optional(),
      requestKind: z.enum(["general", "maintenance"]).optional(),
      title: z.string().min(1),
      description: z.string().optional(),
      propertyId: z.number().optional(),
      unitId: z.number().optional(),
      tenantId: z.number().optional(),
      category: z.enum(["plumbing", "electrical", "hvac", "appliance", "structural", "pest", "cleaning", "general", "other"]).optional(),
      priority: z.enum(["urgent", "high", "medium", "low"]).optional(),
      assigneeName: z.string().optional(),
      dueDate: z.string().optional(),
      accessToProperty: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      let tenantId = input.tenantId;
      let type = input.type;
      if (ctx.user.role === "tenant") {
        const myTenant = await db.getTenantByUserId(ctx.user.id);
        tenantId = myTenant?.id;
        type = "tenant_request";
      }
      const id = await db2.createTask({
        ...input, tenantId, type,
        dueDate: input.dueDate ? new Date(input.dueDate) as any : undefined,
      });
      return { id };
    }),
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      description: z.string().optional(),
      status: z.enum(["not_started", "in_progress", "on_hold", "completed", "overdue"]).optional(),
      priority: z.enum(["urgent", "high", "medium", "low"]).optional(),
      assigneeName: z.string().optional(),
      dueDate: z.string().optional(),
    }))
    .mutation(({ input }) => {
      const { id, dueDate, ...rest } = input;
      const data: any = { ...rest };
      if (dueDate) data.dueDate = new Date(dueDate);
      if (rest.status === "completed") data.completedAt = new Date();
      return db2.updateTask(id, data);
    }),
  postUpdate: tenantOrAdminProcedure
    .input(z.object({ taskId: z.number(), message: z.string().min(1) }))
    .mutation(({ input, ctx }) => db2.createTaskUpdate({
      taskId: input.taskId, message: input.message,
      authorId: ctx.user.id, authorName: ctx.user.name ?? "User",
    })),
  delete: adminProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db2.deleteTask(input.id)),
});

// ═══════════════════════════════════════════════════════════════════════════════
// Work Orders
// ═══════════════════════════════════════════════════════════════════════════════
const workOrdersRouter = router({
  list: adminProcedure
    .input(z.object({ status: z.string().optional(), vendorId: z.number().optional(), propertyId: z.number().optional() }).optional())
    .query(({ input }) => db2.getWorkOrders(input)),
  byId: adminProcedure.input(z.object({ id: z.number() })).query(({ input }) => db2.getWorkOrderById(input.id)),
  create: adminProcedure
    .input(z.object({
      taskId: z.number().optional(),
      vendorId: z.number().optional(),
      propertyId: z.number().optional(),
      unitId: z.number().optional(),
      subject: z.string().min(1),
      workDescription: z.string().optional(),
      isRecurring: z.boolean().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      frequency: z.enum(["daily", "weekly", "biweekly", "monthly", "quarterly", "yearly"]).optional(),
      dueDate: z.string().optional(),
      priority: z.enum(["urgent", "high", "medium", "low"]).optional(),
      assigneeName: z.string().optional(),
      accessToProperty: z.boolean().optional(),
      billAmount: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.vendorId) {
        if (!ctx.user.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "Organization is required" });
        const vendor = await db2.getVendorById(input.vendorId, ctx.user.orgId);
        if (!vendor || vendor.status !== "active") throw new TRPCError({ code: "BAD_REQUEST", message: "Select an active vendor in your organization" });
      }
      return db2.createWorkOrder({
        ...input,
        startDate: input.startDate ? new Date(input.startDate) as any : undefined,
        endDate: input.endDate ? new Date(input.endDate) as any : undefined,
        dueDate: input.dueDate ? new Date(input.dueDate) as any : undefined,
      });
    }),
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["open", "in_progress", "completed", "cancelled"]).optional(),
      vendorId: z.number().nullable().optional(),
      assigneeName: z.string().optional(),
      billAmount: z.string().optional(),
      approvedByOwner: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (input.vendorId) {
        if (!ctx.user.orgId) throw new TRPCError({ code: "BAD_REQUEST", message: "Organization is required" });
        const vendor = await db2.getVendorById(input.vendorId, ctx.user.orgId);
        if (!vendor || vendor.status !== "active") throw new TRPCError({ code: "BAD_REQUEST", message: "Select an active vendor in your organization" });
      }
      const { id, ...data } = input;
      return db2.updateWorkOrder(id, data);
    }),
  delete: adminProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db2.deleteWorkOrder(input.id)),
});

// ═══════════════════════════════════════════════════════════════════════════════
// Banking
// ═══════════════════════════════════════════════════════════════════════════════
const bankingRouter = router({
  accounts: adminProcedure.query(() => db2.getBankAccounts()),
  createAccount: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      type: z.enum(["operating", "security_deposit", "trust", "reserve"]).optional(),
      accountNumberMask: z.string().optional(),
      bankBalance: z.string().optional(),
      bookBalance: z.string().optional(),
    }))
    .mutation(({ input }) => db2.createBankAccount(input)),
  transactions: adminProcedure
    .input(z.object({ bankAccountId: z.number().optional(), startDate: z.string().optional(), endDate: z.string().optional() }).optional())
    .query(({ input }) => db2.getTransactions({ ...input, types: ["payment", "expense", "deposit", "bank_transfer", "owner_contribution", "owner_distribution"] })),
});

// ═══════════════════════════════════════════════════════════════════════════════
// Accounting / Transactions (charges, payments, expenses, deposits)
// ═══════════════════════════════════════════════════════════════════════════════
const transactionsRouter = router({
  list: adminProcedure
    .input(z.object({
      type: z.string().optional(),
      leaseId: z.number().optional(),
      tenantId: z.number().optional(),
      propertyId: z.number().optional(),
      vendorId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .query(({ input }) => db2.getTransactions(input)),

  byId: adminProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const t = await db2.getTransactionById(input.id);
    if (!t) throw new TRPCError({ code: "NOT_FOUND" });
    const lineItems = await db2.getLineItems(input.id);
    return { ...t, lineItems };
  }),

  leaseLedger: tenantOrAdminProcedure
    .input(z.object({ leaseId: z.number() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role === "tenant") {
        const myTenant = await db.getTenantByUserId(ctx.user.id);
        const lease = await db.getLeaseById(input.leaseId);
        if (!myTenant || !lease || lease.tenantId !== myTenant.id) throw new TRPCError({ code: "FORBIDDEN" });
      }
      return db2.getLeaseLedger(input.leaseId);
    }),

  outstandingBalances: adminProcedure.query(() => db2.getOutstandingBalanceByLease()),

  // Create a charge with optional line items (CAM, Property Taxes, Base Rent, etc.)
  createCharge: adminProcedure
    .input(z.object({
      leaseId: z.number(),
      tenantId: z.number().optional(),
      propertyId: z.number().optional(),
      unitId: z.number().optional(),
      date: z.string(),
      description: z.string().optional(),
      lineItems: z.array(z.object({ account: z.string(), description: z.string().optional(), amount: z.string() })).min(1),
    }))
    .mutation(async ({ input }) => {
      const total = input.lineItems.reduce((s, li) => s + Number(li.amount), 0);
      const txnId = await db2.createTransaction({
        type: "charge",
        date: new Date(input.date) as any,
        leaseId: input.leaseId,
        tenantId: input.tenantId,
        propertyId: input.propertyId,
        unitId: input.unitId,
        amount: total.toFixed(2),
        description: input.description,
        status: "pending",
      });
      for (const li of input.lineItems) {
        await db2.createLineItem({ transactionId: txnId, account: li.account, description: li.description, amount: li.amount });
      }
      return { id: txnId };
    }),

  // Record a payment against a lease
  createPayment: adminProcedure
    .input(z.object({
      leaseId: z.number(),
      tenantId: z.number().optional(),
      propertyId: z.number().optional(),
      bankAccountId: z.number().optional(),
      date: z.string(),
      amount: z.string(),
      paymentMethod: z.enum(["cash", "check", "credit_card", "cashiers_check", "money_order", "eft", "ach", "debit_card"]).optional(),
      reference: z.string().optional(),
      memo: z.string().optional(),
    }))
    .mutation(({ input }) => db2.createTransaction({
      type: "payment",
      date: new Date(input.date) as any,
      leaseId: input.leaseId,
      tenantId: input.tenantId,
      propertyId: input.propertyId,
      bankAccountId: input.bankAccountId,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      reference: input.reference,
      memo: input.memo,
      status: "received",
    })),

  // Record an expense with optional line items
  createExpense: adminProcedure
    .input(z.object({
      vendorId: z.number().optional(),
      propertyId: z.number().optional(),
      unitId: z.number().optional(),
      bankAccountId: z.number().optional(),
      date: z.string(),
      category: z.string().optional(),
      description: z.string().optional(),
      reference: z.string().optional(),
      paymentMethod: z.enum(["cash", "check", "credit_card", "cashiers_check", "money_order", "eft", "ach", "debit_card"]).optional(),
      receiptUrl: z.string().optional(),
      lineItems: z.array(z.object({ account: z.string(), description: z.string().optional(), amount: z.string() })).optional(),
      amount: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const total = input.lineItems?.length
        ? input.lineItems.reduce((s, li) => s + Number(li.amount), 0)
        : Number(input.amount ?? 0);
      const txnId = await db2.createTransaction({
        type: "expense",
        date: new Date(input.date) as any,
        vendorId: input.vendorId,
        propertyId: input.propertyId,
        unitId: input.unitId,
        bankAccountId: input.bankAccountId,
        category: input.category ?? input.lineItems?.[0]?.account,
        amount: total.toFixed(2),
        description: input.description,
        reference: input.reference,
        paymentMethod: input.paymentMethod,
        receiptUrl: input.receiptUrl,
        status: "paid",
      });
      if (input.lineItems?.length) {
        for (const li of input.lineItems) {
          await db2.createLineItem({ transactionId: txnId, account: li.account, description: li.description, amount: li.amount });
        }
      }
      return { id: txnId };
    }),

  // Record a deposit
  createDeposit: adminProcedure
    .input(z.object({
      bankAccountId: z.number(),
      date: z.string(),
      amount: z.string(),
      description: z.string().optional(),
    }))
    .mutation(({ input }) => db2.createTransaction({
      type: "deposit",
      date: new Date(input.date) as any,
      bankAccountId: input.bankAccountId,
      amount: input.amount,
      description: input.description,
      status: "cleared",
    })),

  // Bulk post charges to multiple leases (e.g. CAM allocation by sqft)
  bulkPostCharges: adminProcedure
    .input(z.object({
      date: z.string(),
      account: z.string(),
      description: z.string().optional(),
      charges: z.array(z.object({
        leaseId: z.number(),
        tenantId: z.number().optional(),
        propertyId: z.number().optional(),
        unitId: z.number().optional(),
        amount: z.string(),
      })),
    }))
    .mutation(async ({ input }) => {
      let posted = 0;
      for (const c of input.charges) {
        if (Number(c.amount) <= 0) continue;
        const txnId = await db2.createTransaction({
          type: "charge",
          date: new Date(input.date) as any,
          leaseId: c.leaseId,
          tenantId: c.tenantId,
          propertyId: c.propertyId,
          unitId: c.unitId,
          amount: c.amount,
          description: input.description ?? input.account,
          status: "pending",
        });
        await db2.createLineItem({ transactionId: txnId, account: input.account, description: input.description, amount: c.amount });
        posted++;
      }
      return { posted };
    }),

  delete: adminProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db2.deleteTransaction(input.id)),
});

// ═══════════════════════════════════════════════════════════════════════════════
// Recurring charges (rent schedules w/ future increases & CAM)
// ═══════════════════════════════════════════════════════════════════════════════
const recurringRouter = router({
  byLease: adminProcedure.input(z.object({ leaseId: z.number() })).query(({ input }) => db2.getRecurringCharges(input.leaseId)),
  create: adminProcedure
    .input(z.object({
      leaseId: z.number(),
      account: z.string().min(1),
      description: z.string().optional(),
      amount: z.string(),
      frequency: z.enum(["monthly", "quarterly", "yearly", "weekly"]).optional(),
      startDate: z.string(),
      endDate: z.string().optional(),
      effectiveDate: z.string().optional(),
      isIncrease: z.boolean().optional(),
    }))
    .mutation(({ input }) => db2.createRecurringCharge({
      ...input,
      startDate: new Date(input.startDate) as any,
      endDate: input.endDate ? new Date(input.endDate) as any : undefined,
      effectiveDate: input.effectiveDate ? new Date(input.effectiveDate) as any : new Date(input.startDate) as any,
    })),
  delete: adminProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db2.deleteRecurringCharge(input.id)),
});

// ═══════════════════════════════════════════════════════════════════════════════
// Communications (announcements)
// ═══════════════════════════════════════════════════════════════════════════════
const communicationsRouter = router({
  announcements: tenantOrAdminProcedure.query(() => db2.getAnnouncements()),
  createAnnouncement: adminProcedure
    .input(z.object({
      title: z.string().min(1),
      body: z.string().min(1),
      propertyId: z.number().optional(),
      audience: z.enum(["all_tenants", "property", "specific"]).optional(),
    }))
    .mutation(({ input, ctx }) => db2.createAnnouncement({ ...input, sentBy: ctx.user.id })),
  deleteAnnouncement: adminProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db2.deleteAnnouncement(input.id)),
});

// ═══════════════════════════════════════════════════════════════════════════════
// Calendar
// ═══════════════════════════════════════════════════════════════════════════════
const calendarRouter = router({
  events: adminProcedure
    .input(z.object({ startDate: z.string().optional(), endDate: z.string().optional() }).optional())
    .query(({ input }) => db2.getCalendarEvents(input?.startDate, input?.endDate)),
  create: adminProcedure
    .input(z.object({
      title: z.string().min(1),
      type: z.enum(["move_in", "move_out", "lease_expiration", "inspection", "task", "showing", "other"]).optional(),
      date: z.string(),
      propertyId: z.number().optional(),
      unitId: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(({ input }) => db2.createCalendarEvent({ ...input, date: new Date(input.date) as any })),
});

// ═══════════════════════════════════════════════════════════════════════════════
// Inspections
// ═══════════════════════════════════════════════════════════════════════════════
const inspectionsRouter = router({
  list: adminProcedure.input(z.object({ propertyId: z.number().optional() }).optional()).query(({ input }) => db2.getInspections(input?.propertyId)),
  create: adminProcedure
    .input(z.object({
      propertyId: z.number().optional(),
      unitId: z.number().optional(),
      type: z.enum(["move_in", "move_out", "routine", "drive_by", "annual"]).optional(),
      scheduledDate: z.string().optional(),
      inspectorName: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(({ input }) => db2.createInspection({ ...input, scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) as any : undefined })),
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).optional(),
      completedDate: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(({ input }) => {
      const { id, completedDate, ...rest } = input;
      const data: any = { ...rest };
      if (completedDate) data.completedDate = new Date(completedDate);
      return db2.updateInspection(id, data);
    }),
});

// ═══════════════════════════════════════════════════════════════════════════════
// Reports
// ═══════════════════════════════════════════════════════════════════════════════
const reportsRouter = router({
  profitAndLoss: adminProcedure
    .input(z.object({ startDate: z.string(), endDate: z.string(), propertyId: z.number().optional() }))
    .query(({ input }) => db2.getProfitAndLoss(input)),
  arAging: adminProcedure.input(z.object({ asOf: z.string() })).query(({ input }) => db2.getArAging(input.asOf)),
  camReconciliation: adminProcedure
    .input(z.object({ propertyId: z.number(), startDate: z.string(), endDate: z.string(), recoverableAccounts: z.array(z.string()) }))
    .query(({ input }) => db2.getCamReconciliation(input)),
});

// ═══════════════════════════════════════════════════════════════════════════════
// Overview dashboard
// ═══════════════════════════════════════════════════════════════════════════════
const overviewRouter = router({
  data: adminProcedure.query(() => db2.getOverviewData()),
});

// ═══════════════════════════════════════════════════════════════════════════════
// AutoPay (tenant)
// ═══════════════════════════════════════════════════════════════════════════════
const autopayRouter = router({
  mySettings: protectedProcedure.query(async ({ ctx }) => {
    const tenant = await db.getTenantByUserId(ctx.user.id);
    if (!tenant) return null;
    return db2.getAutopayByTenant(tenant.id);
  }),
  save: protectedProcedure
    .input(z.object({
      leaseId: z.number().optional(),
      enabled: z.boolean(),
      dayOfMonth: z.number().min(1).max(28),
      paymentMethod: z.enum(["bank_account", "credit_card"]),
      amount: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const tenant = await db.getTenantByUserId(ctx.user.id);
      if (!tenant) throw new TRPCError({ code: "FORBIDDEN" });
      return db2.upsertAutopay({ ...input, tenantId: tenant.id });
    }),
});

// ═══════════════════════════════════════════════════════════════════════════════
// Tenant Portal: self-service payment
// ═══════════════════════════════════════════════════════════════════════════════
const portalRouter = router({
  // Returns enriched active-lease context: lease + unit + property for the welcome card
  myDashboard: protectedProcedure.query(async ({ ctx }) => {
    const tenant = await db.getTenantByUserId(ctx.user.id);
    if (!tenant) return null;

    const allLeases = await db.getLeasesByTenant(tenant.id);
    const activeLease = allLeases.find((l) => l.status === "active") ?? allLeases[0] ?? null;

    if (!activeLease) return { tenant, lease: null, unit: null, property: null, nextDueDate: null, daysUntilExpiry: null };

    const [unit, property] = await Promise.all([
      db.getUnitById(activeLease.unitId),
      activeLease.unitId ? db.getUnitById(activeLease.unitId).then((u) => u?.propertyId ? db.getPropertyById(u.propertyId) : undefined) : undefined,
    ]);

    // Next due date: find the next pending/overdue payment, or compute from paymentDueDay
    const today = new Date();
    const dueDay = activeLease.paymentDueDay ?? 1;
    const nextDue = new Date(today.getFullYear(), today.getMonth(), dueDay);
    if (nextDue <= today) nextDue.setMonth(nextDue.getMonth() + 1);

    // Days until lease expiry
    const leaseEnd = activeLease.endDate ? new Date(activeLease.endDate) : null;
    const daysUntilExpiry = leaseEnd ? Math.ceil((leaseEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;

    return {
      tenant,
      lease: activeLease,
      unit: unit ?? null,
      property: property ?? null,
      nextDueDate: nextDue.toISOString(),
      daysUntilExpiry,
    };
  }),

  makePayment: protectedProcedure
    .input(z.object({
      leaseId: z.number(),
      amount: z.string(),
      paymentMethod: z.enum(["ach", "credit_card", "debit_card"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const tenant = await db.getTenantByUserId(ctx.user.id);
      if (!tenant) throw new TRPCError({ code: "FORBIDDEN" });
      const lease = await db.getLeaseById(input.leaseId);
      if (!lease || lease.tenantId !== tenant.id) throw new TRPCError({ code: "FORBIDDEN" });
      const unit = await db.getUnitById(lease.unitId);
      // Simulated payment processing — record a payment transaction
      await db2.createTransaction({
        type: "payment",
        date: new Date() as any,
        leaseId: input.leaseId,
        tenantId: tenant.id,
        unitId: lease.unitId,
        propertyId: unit?.propertyId ?? undefined,
        amount: input.amount,
        paymentMethod: input.paymentMethod === "credit_card" || input.paymentMethod === "debit_card" ? input.paymentMethod as any : "ach",
        reference: `PORTAL-${Date.now()}`,
        memo: "Tenant portal payment (simulated)",
        status: "received",
      });
      return { success: true };
    }),
});

// ═══════════════════════════════════════════════════════════════════════════════
// AI features: assistant, insights, expense capture
// ═══════════════════════════════════════════════════════════════════════════════
const aiRouter = router({
  assistant: adminProcedure
    .input(z.object({ question: z.string().min(1) }))
    .mutation(async ({ input }) => {
      // Provide context from the portfolio
      const [metrics, overview] = await Promise.all([db.getDashboardMetrics(), db2.getOverviewData()]);
      const context = JSON.stringify({ metrics, stats: overview?.stats, occupancy: overview?.occupancy });
      const res = await invokeLLM({
        messages: [
          { role: "system", content: `You are the WAA PropFlow AI assistant, an expert property management analyst. Use this live portfolio data to answer questions concisely and helpfully. Portfolio data: ${context}` },
          { role: "user", content: input.question },
        ],
      });
      return { answer: res.choices?.[0]?.message?.content ?? "I couldn't generate a response." };
    }),

  insights: adminProcedure
    .input(z.object({ scope: z.string().optional() }).optional())
    .query(async () => {
      const [metrics, overview, outstanding] = await Promise.all([
        db.getDashboardMetrics(), db2.getOverviewData(), db2.getOutstandingBalanceByLease(),
      ]);
      const totalOutstanding = outstanding.reduce((s, o) => s + o.balance, 0);
      const context = JSON.stringify({ metrics, stats: overview?.stats, occupancy: overview?.occupancy, totalOutstanding, delinquentLeases: outstanding.length });
      const res = await invokeLLM({
        messages: [
          { role: "system", content: "You are a property management financial analyst. Given portfolio data, produce 3-4 short, specific, actionable insights as a markdown bulleted list. Be concise and data-driven." },
          { role: "user", content: `Generate insights from this data: ${context}` },
        ],
      });
      return { insights: res.choices?.[0]?.message?.content ?? "No insights available." };
    }),

  captureExpense: adminProcedure
    .input(z.object({ imageUrl: z.string() }))
    .mutation(async ({ input }) => {
      const res = await invokeLLM({
        messages: [
          { role: "system", content: "You extract structured expense data from invoice/receipt images. Always respond with the requested JSON." },
          {
            role: "user", content: [
              { type: "text", text: "Extract the vendor name, total amount (number only), date (YYYY-MM-DD), and a suggested expense category from this receipt." },
              { type: "image_url", image_url: { url: input.imageUrl } },
            ] as any,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "expense_capture",
            strict: true,
            schema: {
              type: "object",
              properties: {
                vendor: { type: "string" },
                amount: { type: "number" },
                date: { type: "string" },
                category: { type: "string" },
              },
              required: ["vendor", "amount", "date", "category"],
              additionalProperties: false,
            },
          },
        },
      });
      const content = res.choices?.[0]?.message?.content ?? "{}";
      try {
        return JSON.parse(typeof content === "string" ? content : "{}");
      } catch {
        return { vendor: "", amount: 0, date: "", category: "other" };
      }
    }),
});

export const v2Routers = {
  vendors: vendorsRouter,
  prospects: prospectsRouter,
  applications: applicationsRouter,
  tasks: tasksRouter,
  workOrders: workOrdersRouter,
  banking: bankingRouter,
  transactions: transactionsRouter,
  recurring: recurringRouter,
  communications: communicationsRouter,
  calendar: calendarRouter,
  inspections: inspectionsRouter,
  reports: reportsRouter,
  overview: overviewRouter,
  autopay: autopayRouter,
  portal: portalRouter,
  ai: aiRouter,
};
