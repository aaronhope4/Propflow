import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getVendors: vi.fn(), createVendor: vi.fn(), updateVendor: vi.fn(), deleteVendor: vi.fn(), getVendorById: vi.fn(),
  getVendorCertificates: vi.fn(), deleteVendorCertificate: vi.fn(), getVendorPerformanceNotes: vi.fn(), createVendorPerformanceNote: vi.fn(), deleteVendorPerformanceNote: vi.fn(), getVendorCompliance: vi.fn(),
  createWorkOrder: vi.fn(),
}));
vi.mock("./db2", () => mocks);

import { appRouter } from "./routers";

function createAdminContext(): TrpcContext {
  return { user: { id: 1, openId: "vendor-admin", email: "admin@example.com", name: "Admin", loginMethod: "email", role: "admin", orgId: 5, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("vendors router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getVendors.mockResolvedValue([]);
    mocks.createVendor.mockResolvedValue(undefined);
    mocks.updateVendor.mockResolvedValue(undefined);
    mocks.deleteVendor.mockResolvedValue(undefined);
    mocks.getVendorById.mockResolvedValue({ id: 82, orgId: 5, status: "active", name: "Jordan Lee", company: "Acme Mechanical" });
    mocks.getVendorCertificates.mockResolvedValue([]);
    mocks.getVendorPerformanceNotes.mockResolvedValue([]);
    mocks.createVendorPerformanceNote.mockResolvedValue(undefined);
    mocks.deleteVendorPerformanceNote.mockResolvedValue(undefined);
    mocks.deleteVendorCertificate.mockResolvedValue(undefined);
    mocks.getVendorCompliance.mockResolvedValue([]);
    mocks.createWorkOrder.mockResolvedValue(undefined);
  });

  it("scopes vendor listing to the signed-in organization", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(caller.vendors.list()).resolves.toEqual([]);
    expect(mocks.getVendors).toHaveBeenCalledWith(5);
  });

  it("creates a vendor with organization ownership and required directory fields", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await caller.vendors.create({ name: "Jordan Lee", company: "Acme Mechanical", category: "hvac", specialties: "Commercial HVAC", phone: "555-555-1234", address: "100 Main St" });
    expect(mocks.createVendor).toHaveBeenCalledWith(expect.objectContaining({ orgId: 5, name: "Jordan Lee", company: "Acme Mechanical", specialties: "Commercial HVAC" }));
  });

  it("scopes vendor updates to the signed-in organization", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await caller.vendors.update({ id: 82, company: "Updated Mechanical", specialties: "Rooftop HVAC" });
    expect(mocks.updateVendor).toHaveBeenCalledWith(82, 5, expect.objectContaining({ company: "Updated Mechanical", specialties: "Rooftop HVAC" }));
  });

  it("scopes vendor deletion to the signed-in organization", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await caller.vendors.delete({ id: 82 });
    expect(mocks.deleteVendor).toHaveBeenCalledWith(82, 5);
  });

  it("scopes certificate and performance records to the signed-in organization", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await caller.vendors.certificates({ vendorId: 82 });
    await caller.vendors.addPerformanceNote({ vendorId: 82, note: "Responsive and on time", rating: 5 });
    await caller.vendors.compliance();
    expect(mocks.getVendorCertificates).toHaveBeenCalledWith(82, 5);
    expect(mocks.createVendorPerformanceNote).toHaveBeenCalledWith(expect.objectContaining({ vendorId: 82, orgId: 5, authorId: 1, rating: 5 }));
    expect(mocks.getVendorCompliance).toHaveBeenCalledWith(5);
  });

  it("allows work-order assignment only to an active vendor in the same organization", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await caller.workOrders.create({ subject: "Quarterly HVAC service", vendorId: 82, propertyId: 1 });
    expect(mocks.getVendorById).toHaveBeenCalledWith(82, 5);
    expect(mocks.createWorkOrder).toHaveBeenCalledWith(expect.objectContaining({ subject: "Quarterly HVAC service", vendorId: 82 }));
  });

  it("scopes performance note removal to the signed-in organization", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await caller.vendors.removePerformanceNote({ id: 73 });
    expect(mocks.deleteVendorPerformanceNote).toHaveBeenCalledWith(73, 5);
  });
});
