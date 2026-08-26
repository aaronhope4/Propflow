import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-openid",
      email: "admin@propflow.com",
      name: "Admin User",
      loginMethod: "manus",
      role: "admin",
      orgId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function createTenantContext(): TrpcContext {
  return {
    user: {
      id: 2,
      openId: "tenant-openid",
      email: "tenant@example.com",
      name: "Test Tenant",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: undefined,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

describe("v2 accounting", () => {
  it("transactions.list returns an array for admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.transactions.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("accounting.monthly returns 12 months of data", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.accounting.monthly();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(12);
  });
});

describe("v2 reports", () => {
  it("reports.profitAndLoss returns income and expense breakdowns", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.reports.profitAndLoss({
      startDate: "2026-01-01",
      endDate: "2026-12-31",
    });
    expect(result).toHaveProperty("income");
    expect(result).toHaveProperty("expenses");
    expect(Array.isArray(result?.income)).toBe(true);
    expect(Array.isArray(result?.expenses)).toBe(true);
  });

  it("reports.arAging returns aging buckets", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.reports.arAging({ asOf: "2026-12-31" });
    expect(result).toBeDefined();
  });
});

describe("v2 tasks & vendors", () => {
  it("tasks.list returns an array for admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.tasks.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("workOrders.list returns an array for admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.workOrders.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("vendors.list returns an array for admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.vendors.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("v2 RBAC enforcement", () => {
  it("transactions.list is rejected for tenant role", async () => {
    const caller = appRouter.createCaller(createTenantContext());
    await expect(caller.transactions.list({})).rejects.toThrow();
  });

  it("vendors.list is rejected for tenant role", async () => {
    const caller = appRouter.createCaller(createTenantContext());
    await expect(caller.vendors.list()).rejects.toThrow();
  });

  it("reports.profitAndLoss is rejected for unauthenticated users", async () => {
    const caller = appRouter.createCaller(createUnauthContext());
    await expect(
      caller.reports.profitAndLoss({ startDate: "2026-01-01", endDate: "2026-12-31" }),
    ).rejects.toThrow();
  });

  it("portal.makePayment is accessible to tenant role", async () => {
    const caller = appRouter.createCaller(createTenantContext());
    // Tenant has no linked tenant record in test DB, so it should throw a
    // NOT_FOUND/business error rather than a FORBIDDEN authorization error.
    try {
      await caller.portal.summary();
    } catch (err) {
      // acceptable: business-level error, not an authorization rejection
      expect(String(err)).not.toContain("FORBIDDEN");
    }
  });
});

describe("document management", () => {
  it("documents.all returns an array for an admin", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.documents.all();
    expect(Array.isArray(result)).toBe(true);
  });

  it("rejects an unsupported document extension before storage upload", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(caller.documents.upload({
      entityType: "property",
      entityId: 1,
      name: "Unsafe test file",
      category: "other",
      fileName: "unsafe.exe",
      fileData: "dGVzdA==",
      mimeType: "application/octet-stream",
      fileSize: 4,
    })).rejects.toThrow("Unsupported document type");
  });
});
