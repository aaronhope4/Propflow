import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({ getDocumentById: vi.fn(), setDocumentShare: vi.fn() }));
vi.mock("./db", () => ({ getDocumentById: mocks.getDocumentById, setDocumentShare: mocks.setDocumentShare }));

import { appRouter } from "./routers";

function createAdminContext(): TrpcContext {
  return { user: { id: 1, openId: "admin", email: "admin@example.com", name: "Admin", loginMethod: "email", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("document share-link procedures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDocumentById.mockResolvedValue({ id: 99, fileKey: "documents/property/1/lease.pdf" });
    mocks.setDocumentShare.mockResolvedValue(undefined);
  });

  it("creates an expiring public link and persists its opaque token", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    const result = await caller.documents.createShareLink({ id: 99, durationHours: 24, origin: "https://propflow.example.test" });
    expect(result.shareUrl).toMatch(/^https:\/\/propflow\.example\.test\/share\/doc\//);
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(mocks.setDocumentShare).toHaveBeenCalledWith(99, expect.any(String), expect.any(Date));
  });

  it("revokes an existing link by clearing token and expiry metadata", async () => {
    const caller = appRouter.createCaller(createAdminContext());
    await expect(caller.documents.revokeShareLink({ id: 99 })).resolves.toEqual({ success: true });
    expect(mocks.setDocumentShare).toHaveBeenCalledWith(99, null, null);
  });
});
