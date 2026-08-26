import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "admin-openid",
      email: "admin@propflow.com",
      name: "Admin User",
      loginMethod: "manus",
      role: "admin",
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

// ─── Auth Tests ───────────────────────────────────────────────────────────────

describe("auth", () => {
  it("auth.me returns user when authenticated", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.role).toBe("admin");
  });

  it("auth.me returns null when unauthenticated", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeUndefined();
  });

  it("auth.logout clears session cookie", async () => {
    const clearedCookies: string[] = [];
    const ctx: TrpcContext = {
      ...createAdminContext(),
      res: {
        clearCookie: (name: string) => { clearedCookies.push(name); },
      } as unknown as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
    expect(clearedCookies.length).toBeGreaterThan(0);
  });
});

// ─── RBAC Tests ───────────────────────────────────────────────────────────────

describe("RBAC - admin-only procedures", () => {
  it("properties.list throws FORBIDDEN for unauthenticated users", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.properties.list()).rejects.toThrow();
  });

  it("properties.list throws FORBIDDEN for tenant role users", async () => {
    const ctx = createTenantContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.properties.list()).rejects.toThrow();
  });

  it("tenants.list throws FORBIDDEN for tenant role users", async () => {
    const ctx = createTenantContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.tenants.list()).rejects.toThrow();
  });

  it("owners.list throws FORBIDDEN for tenant role users", async () => {
    const ctx = createTenantContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.owners.list()).rejects.toThrow();
  });

  it("accounting.expenses throws FORBIDDEN for tenant role users", async () => {
    const ctx = createTenantContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.accounting.expenses()).rejects.toThrow();
  });
});

describe("RBAC - tenant-accessible procedures", () => {
  it("leases.myLeases is accessible to tenant role users", async () => {
    const ctx = createTenantContext();
    const caller = appRouter.createCaller(ctx);
    // Should not throw - tenant can access their own leases
    const result = await caller.leases.myLeases();
    expect(Array.isArray(result)).toBe(true);
  });

  it("rentPayments.myPayments is accessible to tenant role users", async () => {
    const ctx = createTenantContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.rentPayments.myPayments();
    expect(Array.isArray(result)).toBe(true);
  });

  it("maintenance.myRequests is accessible to tenant role users", async () => {
    const ctx = createTenantContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.maintenance.myRequests();
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Input Validation Tests ───────────────────────────────────────────────────

describe("input validation", () => {
  it("properties.create rejects empty name", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.properties.create({
        name: "",
        address: "123 Main St",
        city: "Austin",
        state: "TX",
        zip: "78701",
        type: "residential",
        totalUnits: 1,
      })
    ).rejects.toThrow();
  });

  it("leases.create rejects negative rent amount", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.leases.create({
        unitId: 1,
        tenantId: 1,
        startDate: "2024-01-01",
        endDate: "2025-01-01",
        rentAmount: -500,
        depositAmount: 1000,
        paymentDueDay: 1,
      })
    ).rejects.toThrow();
  });

  it("maintenance.create rejects empty title", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.maintenance.create({
        unitId: 1,
        title: "",
        description: "Some description",
        category: "plumbing",
        priority: "medium",
      })
    ).rejects.toThrow();
  });
});

// ─── Dashboard Tests ──────────────────────────────────────────────────────────

describe("dashboard", () => {
  it("dashboard.metrics returns expected shape", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const metrics = await caller.dashboard.metrics();
    expect(metrics).toHaveProperty("totalProperties");
    expect(metrics).toHaveProperty("totalUnits");
    expect(metrics).toHaveProperty("occupiedUnits");
    expect(metrics).toHaveProperty("activeLeases");
    expect(metrics).toHaveProperty("totalRentCollected");
    expect(metrics).toHaveProperty("overdueCount");
    expect(metrics).toHaveProperty("openMaintenance");
    expect(typeof metrics.totalProperties).toBe("number");
    expect(typeof metrics.totalUnits).toBe("number");
  });

  it("dashboard.monthlyFinancials returns array", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const data = await caller.dashboard.monthlyFinancials({ year: 2026 });
    expect(Array.isArray(data)).toBe(true);
  });
});
