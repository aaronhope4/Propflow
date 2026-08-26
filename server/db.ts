import { and, desc, eq, sql, count, sum, or, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  owners, InsertOwner,
  properties, InsertProperty,
  units, InsertUnit,
  tenants, InsertTenant,
  leases, InsertLease,
  rentPayments, InsertRentPayment,
  maintenanceRequests, InsertMaintenanceRequest,
  expenses, InsertExpense,
  documents, InsertDocument,
} from "../drizzle/schema";
import {
  prospects, tasks, taskUpdates, workOrders, transactions, transactionLineItems,
  recurringCharges, announcements, calendarEvents, rentalApplications, inspections,
  autopaySettings,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

// ─── Owners ───────────────────────────────────────────────────────────────────
export async function getOwners(orgId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (orgId) return db.select().from(owners).where(eq(owners.orgId, orgId)).orderBy(desc(owners.createdAt));
  return db.select().from(owners).orderBy(desc(owners.createdAt));
}

export async function getOwnerById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(owners).where(eq(owners.id, id)).limit(1);
  return result[0];
}

export async function createOwner(data: InsertOwner) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(owners).values(data);
  return result[0];
}

export async function updateOwner(id: number, data: Partial<InsertOwner>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(owners).set(data).where(eq(owners.id, id));
}

export async function deleteOwner(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(owners).where(eq(owners.id, id));
}

// ─── Properties ───────────────────────────────────────────────────────────────
export async function getProperties(ownerId?: number, orgId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (ownerId) conditions.push(eq(properties.ownerId, ownerId));
  if (orgId) conditions.push(eq(properties.orgId, orgId));
  const query = db.select().from(properties);
  if (conditions.length > 0) return query.where(and(...conditions)).orderBy(desc(properties.createdAt));
  return query.orderBy(desc(properties.createdAt));
}

export async function getPropertyById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(properties).where(eq(properties.id, id)).limit(1);
  return result[0];
}

export async function createProperty(data: InsertProperty) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(properties).values(data);
}

export async function updateProperty(id: number, data: Partial<InsertProperty>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(properties).set(data).where(eq(properties.id, id));
}

export async function deleteProperty(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  // 1. Collect unit IDs for this property
  const propertyUnits = await db.select({ id: units.id }).from(units).where(eq(units.propertyId, id));
  const unitIds = propertyUnits.map(u => u.id);

  // 2. Collect lease IDs for those units
  const propertyLeases = unitIds.length
    ? await db.select({ id: leases.id }).from(leases).where(inArray(leases.unitId, unitIds))
    : [];
  const leaseIds = propertyLeases.map(l => l.id);

  // 3. Collect task IDs for this property
  const propertyTasks = await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.propertyId, id));
  const taskIds = propertyTasks.map(t => t.id);

  // 4. Collect transaction IDs for this property
  const propertyTxns = await db.select({ id: transactions.id }).from(transactions).where(eq(transactions.propertyId, id));
  const txnIds = propertyTxns.map(t => t.id);

  // ── Delete leaf tables first (no children) ──────────────────────────────────
  if (leaseIds.length) {
    await db.delete(rentPayments).where(inArray(rentPayments.leaseId, leaseIds));
    await db.delete(recurringCharges).where(inArray(recurringCharges.leaseId, leaseIds));
    await db.delete(autopaySettings).where(inArray(autopaySettings.leaseId, leaseIds));
  }
  if (txnIds.length) {
    await db.delete(transactionLineItems).where(inArray(transactionLineItems.transactionId, txnIds));
  }
  if (taskIds.length) {
    await db.delete(taskUpdates).where(inArray(taskUpdates.taskId, taskIds));
  }

  // ── Delete unit-level children ───────────────────────────────────────────────
  if (unitIds.length) {
    await db.delete(maintenanceRequests).where(inArray(maintenanceRequests.unitId, unitIds));
    await db.delete(inspections).where(inArray(inspections.unitId, unitIds));
    await db.delete(rentalApplications).where(inArray(rentalApplications.unitId, unitIds));
    await db.delete(calendarEvents).where(inArray(calendarEvents.unitId, unitIds));
  }

  // ── Delete property-level children ──────────────────────────────────────────
  if (leaseIds.length) {
    await db.delete(leases).where(inArray(leases.id, leaseIds));
  }
  if (txnIds.length) {
    await db.delete(transactions).where(inArray(transactions.id, txnIds));
  }
  if (taskIds.length) {
    await db.delete(tasks).where(inArray(tasks.id, taskIds));
  }
  await db.delete(workOrders).where(eq(workOrders.propertyId, id));
  await db.delete(expenses).where(eq(expenses.propertyId, id));
  await db.delete(prospects).where(eq(prospects.propertyId, id));
  await db.delete(announcements).where(eq(announcements.propertyId, id));
  await db.delete(calendarEvents).where(eq(calendarEvents.propertyId, id));
  await db.delete(rentalApplications).where(eq(rentalApplications.propertyId, id));
  await db.delete(inspections).where(eq(inspections.propertyId, id));
  await db.delete(documents).where(and(eq(documents.entityType, "property"), eq(documents.entityId, id)));
  if (unitIds.length) {
    await db.delete(units).where(inArray(units.id, unitIds));
  }

  // ── Finally delete the property itself ──────────────────────────────────────
  await db.delete(properties).where(eq(properties.id, id));
}

// ─── Units ────────────────────────────────────────────────────────────────────
export async function getUnitsByProperty(propertyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(units).where(eq(units.propertyId, propertyId)).orderBy(units.unitNumber);
}

export async function getUnitById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(units).where(eq(units.id, id)).limit(1);
  return result[0];
}

export async function getAllUnits() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(units).orderBy(desc(units.createdAt));
}

export async function createUnit(data: InsertUnit) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(units).values(data);
}

export async function updateUnit(id: number, data: Partial<InsertUnit>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(units).set(data).where(eq(units.id, id));
}

export async function deleteUnit(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(units).where(eq(units.id, id));
}

// ─── Tenants ──────────────────────────────────────────────────────────────────
export async function getTenants(orgId?: number) {
  const db = await getDb();
  if (!db) return [];

  // Left-join users to get portal status for each tenant
  const baseQuery = db
    .select({
      id: tenants.id,
      orgId: tenants.orgId,
      userId: tenants.userId,
      name: tenants.name,
      email: tenants.email,
      phone: tenants.phone,
      dateOfBirth: tenants.dateOfBirth,
      emergencyContactName: tenants.emergencyContactName,
      emergencyContactPhone: tenants.emergencyContactPhone,
      emergencyContactRelation: tenants.emergencyContactRelation,
      idType: tenants.idType,
      idNumber: tenants.idNumber,
      employerName: tenants.employerName,
      employerPhone: tenants.employerPhone,
      monthlyIncome: tenants.monthlyIncome,
      notes: tenants.notes,
      status: tenants.status,
      createdAt: tenants.createdAt,
      updatedAt: tenants.updatedAt,
      // Portal status fields from joined users row
      userInviteUsed: users.inviteUsed,
      userInviteToken: users.inviteToken,
      userInviteExpiry: users.inviteTokenExpiry,
    })
    .from(tenants)
    .leftJoin(users, eq(users.id, tenants.userId));

  const rows = orgId
    ? await baseQuery.where(eq(tenants.orgId, orgId)).orderBy(tenants.name)
    : await baseQuery.orderBy(tenants.name);

  // Compute portalStatus: 'active' | 'invited' | 'expired' | 'none'
  const now = new Date();
  return rows.map((r) => {
    let portalStatus: "active" | "invited" | "expired" | "none" = "none";
    if (r.userId) {
      if (r.userInviteUsed) {
        portalStatus = "active";
      } else if (r.userInviteToken) {
        portalStatus = r.userInviteExpiry && r.userInviteExpiry > now ? "invited" : "expired";
      }
    }
    const { userInviteUsed, userInviteToken, userInviteExpiry, ...rest } = r;
    return { ...rest, portalStatus };
  });
}

export async function getTenantById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  return result[0];
}

export async function getTenantByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tenants).where(eq(tenants.userId, userId)).limit(1);
  return result[0];
}

export async function createTenant(data: InsertTenant) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(tenants).values(data);
}

export async function updateTenant(id: number, data: Partial<InsertTenant>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(tenants).set(data).where(eq(tenants.id, id));
}

export async function deleteTenant(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  // 1. Collect lease IDs for this tenant
  const tenantLeases = await db.select({ id: leases.id }).from(leases).where(eq(leases.tenantId, id));
  const leaseIds = tenantLeases.map(l => l.id);

  // 2. Collect task IDs for this tenant
  const tenantTasks = await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.tenantId, id));
  const taskIds = tenantTasks.map(t => t.id);

  // 3. Collect transaction IDs for this tenant
  const tenantTxns = await db.select({ id: transactions.id }).from(transactions).where(eq(transactions.tenantId, id));
  const txnIds = tenantTxns.map(t => t.id);

  // ── Delete leaf tables first ─────────────────────────────────────────────────
  if (leaseIds.length) {
    await db.delete(rentPayments).where(inArray(rentPayments.leaseId, leaseIds));
    await db.delete(recurringCharges).where(inArray(recurringCharges.leaseId, leaseIds));
    await db.delete(autopaySettings).where(inArray(autopaySettings.leaseId, leaseIds));
  }
  if (txnIds.length) {
    await db.delete(transactionLineItems).where(inArray(transactionLineItems.transactionId, txnIds));
  }
  if (taskIds.length) {
    await db.delete(taskUpdates).where(inArray(taskUpdates.taskId, taskIds));
  }

  // ── Delete tenant-level children ─────────────────────────────────────────────
  await db.delete(maintenanceRequests).where(eq(maintenanceRequests.tenantId, id));
  await db.delete(rentPayments).where(eq(rentPayments.tenantId, id));
  if (leaseIds.length) {
    await db.delete(leases).where(inArray(leases.id, leaseIds));
  }
  if (txnIds.length) {
    await db.delete(transactions).where(inArray(transactions.id, txnIds));
  }
  if (taskIds.length) {
    await db.delete(tasks).where(inArray(tasks.id, taskIds));
  }

  // ── Finally delete the tenant ─────────────────────────────────────────────────
  await db.delete(tenants).where(eq(tenants.id, id));
}

// ─── Leases ───────────────────────────────────────────────────────────────────
export async function getLeases(status?: string, orgId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (status) conditions.push(eq(leases.status, status as any));
  // Scope by org via the unit -> property -> org chain when orgId is provided
  if (orgId) {
    // Join through units and properties to filter by org
    const orgProperties = await db.select({ id: properties.id }).from(properties).where(eq(properties.orgId, orgId));
    const propIds = orgProperties.map(p => p.id);
    if (propIds.length === 0) return [];
    const orgUnits = await db.select({ id: units.id }).from(units).where(inArray(units.propertyId, propIds));
    const unitIds = orgUnits.map(u => u.id);
    if (unitIds.length === 0) return [];
    conditions.push(inArray(leases.unitId, unitIds));
  }
  const q = db.select().from(leases);
  if (conditions.length > 0) return q.where(and(...conditions)).orderBy(desc(leases.createdAt));
  return q.orderBy(desc(leases.createdAt));
}

export async function getLeaseById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(leases).where(eq(leases.id, id)).limit(1);
  return result[0];
}

export async function getLeasesByTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(leases).where(eq(leases.tenantId, tenantId)).orderBy(desc(leases.createdAt));
}

export async function getLeasesByUnit(unitId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(leases).where(eq(leases.unitId, unitId)).orderBy(desc(leases.createdAt));
}

export async function getActiveLeaseForUnit(unitId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(leases)
    .where(and(eq(leases.unitId, unitId), eq(leases.status, "active")))
    .limit(1);
  return result[0];
}

export async function createLease(data: InsertLease) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(leases).values(data);
}

export async function updateLease(id: number, data: Partial<InsertLease>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(leases).set(data).where(eq(leases.id, id));
}

export async function deleteLease(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(leases).where(eq(leases.id, id));
}

// ─── Rent Payments ────────────────────────────────────────────────────────────
export async function getRentPayments(filters?: { tenantId?: number; leaseId?: number; status?: string; orgId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (filters?.tenantId) conditions.push(eq(rentPayments.tenantId, filters.tenantId));
  if (filters?.leaseId) conditions.push(eq(rentPayments.leaseId, filters.leaseId));
  if (filters?.status) conditions.push(eq(rentPayments.status, filters.status as any));
  if (filters?.orgId) conditions.push(eq(rentPayments.tenantId, filters.orgId)); // scoped via tenant
  const q = db.select().from(rentPayments);
  if (conditions.length > 0) return q.where(and(...conditions)).orderBy(desc(rentPayments.dueDate));
  return q.orderBy(desc(rentPayments.dueDate));
}

export async function getRentPaymentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(rentPayments).where(eq(rentPayments.id, id)).limit(1);
  return result[0];
}

export async function createRentPayment(data: InsertRentPayment) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(rentPayments).values(data);
}

export async function updateRentPayment(id: number, data: Partial<InsertRentPayment>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(rentPayments).set(data).where(eq(rentPayments.id, id));
}

export async function deleteRentPayment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(rentPayments).where(eq(rentPayments.id, id));
}

// ─── Maintenance Requests ─────────────────────────────────────────────────────
// Deserialize the JSON imageUrls / adminImageUrls strings back into string[]
function deserializeMaintenanceRequest<T extends { imageUrls?: string | null; adminImageUrls?: string | null }>(row: T): T & { parsedImageUrls: string[]; parsedAdminImageUrls: string[] } {
  let parsedImageUrls: string[] = [];
  let parsedAdminImageUrls: string[] = [];
  if (row.imageUrls) {
    try { parsedImageUrls = JSON.parse(row.imageUrls); } catch { /* ignore */ }
  }
  if (row.adminImageUrls) {
    try { parsedAdminImageUrls = JSON.parse(row.adminImageUrls); } catch { /* ignore */ }
  }
  return { ...row, parsedImageUrls, parsedAdminImageUrls };
}

export async function getMaintenanceRequests(filters?: { unitId?: number; tenantId?: number; status?: string; priority?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.unitId) conditions.push(eq(maintenanceRequests.unitId, filters.unitId));
  if (filters?.tenantId) conditions.push(eq(maintenanceRequests.tenantId, filters.tenantId));
  if (filters?.status) conditions.push(eq(maintenanceRequests.status, filters.status as any));
  if (filters?.priority) conditions.push(eq(maintenanceRequests.priority, filters.priority as any));
  const q = db.select().from(maintenanceRequests);
  const rows = conditions.length > 0
    ? await q.where(and(...conditions)).orderBy(desc(maintenanceRequests.createdAt))
    : await q.orderBy(desc(maintenanceRequests.createdAt));
  return rows.map(deserializeMaintenanceRequest);
}

export async function getMaintenanceRequestById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(maintenanceRequests).where(eq(maintenanceRequests.id, id)).limit(1);
  return result[0] ? deserializeMaintenanceRequest(result[0]) : undefined;
}

export async function createMaintenanceRequest(data: InsertMaintenanceRequest) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(maintenanceRequests).values(data);
}

export async function updateMaintenanceRequest(id: number, data: Partial<InsertMaintenanceRequest>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(maintenanceRequests).set(data).where(eq(maintenanceRequests.id, id));
}

export async function deleteMaintenanceRequest(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(maintenanceRequests).where(eq(maintenanceRequests.id, id));
}

// ─── Expenses ─────────────────────────────────────────────────────────────────
export async function getExpenses(propertyId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (propertyId) {
    return db.select().from(expenses).where(eq(expenses.propertyId, propertyId)).orderBy(desc(expenses.date));
  }
  return db.select().from(expenses).orderBy(desc(expenses.date));
}

export async function getExpenseById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
  return result[0];
}

export async function createExpense(data: InsertExpense) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(expenses).values(data);
}

export async function updateExpense(id: number, data: Partial<InsertExpense>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(expenses).set(data).where(eq(expenses.id, id));
}

export async function deleteExpense(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(expenses).where(eq(expenses.id, id));
}

// ─── Documents ────────────────────────────────────────────────────────────────
export async function getDocuments(entityType: string, entityId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(documents)
    .where(and(eq(documents.entityType, entityType as any), eq(documents.entityId, entityId)))
    .orderBy(desc(documents.createdAt));
}

export async function getDocumentsByTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return [];
  // Get documents linked to the tenant directly
  return db.select().from(documents)
    .where(and(eq(documents.entityType, "tenant"), eq(documents.entityId, tenantId)))
    .orderBy(desc(documents.createdAt));
}
export async function getAllDocuments() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(documents).orderBy(desc(documents.createdAt));
}

export async function createDocument(data: InsertDocument) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(documents).values(data);
}

export async function getDocumentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  return result[0];
}

export async function getDocumentByShareToken(shareToken: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(documents).where(eq(documents.shareToken, shareToken)).limit(1);
  return result[0];
}

export async function setDocumentShare(id: number, shareToken: string | null, shareExpiresAt: Date | null) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(documents).set({ shareToken, shareExpiresAt }).where(eq(documents.id, id));
}

export async function deleteDocument(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(documents).where(eq(documents.id, id));
}

// ─── Dashboard Metrics ────────────────────────────────────────────────────────
export async function getDashboardMetrics(orgId?: number) {
  const db = await getDb();

  if (!db) {
    return {
      totalProperties: 0,
      totalUnits: 0,
      occupiedUnits: 0,
      activeLeases: 0,
      overdueCount: 0,
      overdueAmount: 0,
      openMaintenance: 0,
      totalRentCollected: 0,
    };
  }

  // Resolve org-scoped property and unit IDs when orgId is provided
  let propertyIds: number[] | undefined;
  let unitIds: number[] | undefined;
  let tenantIds: number[] | undefined;
  if (orgId) {
    const orgProps = await db.select({ id: properties.id }).from(properties).where(eq(properties.orgId, orgId));
    propertyIds = orgProps.map(p => p.id);
    if (propertyIds.length > 0) {
      const orgUnits = await db.select({ id: units.id }).from(units).where(inArray(units.propertyId, propertyIds));
      unitIds = orgUnits.map(u => u.id);
    } else {
      unitIds = [];
    }
    const orgTenants = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.orgId, orgId));
    tenantIds = orgTenants.map(t => t.id);
  }

  const propFilter = propertyIds && propertyIds.length > 0 ? inArray(properties.id, propertyIds) : undefined;
  const unitFilter = unitIds && unitIds.length > 0 ? inArray(units.id, unitIds) : unitIds?.length === 0 ? sql`1=0` : undefined;
  const leaseFilter = unitIds && unitIds.length > 0 ? inArray(leases.unitId, unitIds) : unitIds?.length === 0 ? sql`1=0` : undefined;
  const paymentFilter = tenantIds && tenantIds.length > 0 ? inArray(rentPayments.tenantId, tenantIds) : tenantIds?.length === 0 ? sql`1=0` : undefined;
  const maintenanceFilter = unitIds && unitIds.length > 0 ? inArray(maintenanceRequests.unitId, unitIds) : unitIds?.length === 0 ? sql`1=0` : undefined;

  const [
    totalProperties,
    totalUnitsResult,
    occupiedUnitsResult,
    activeLeases,
    overduePayments,
    openMaintenance,
    recentPayments,
  ] = await Promise.all([
    db.select({ count: count() }).from(properties).where(propFilter),
    db.select({ count: count() }).from(units).where(unitFilter),
    db.select({ count: count() }).from(units).where(unitFilter ? and(unitFilter, eq(units.status, "occupied")) : eq(units.status, "occupied")),
    db.select({ count: count() }).from(leases).where(leaseFilter ? and(leaseFilter, eq(leases.status, "active")) : eq(leases.status, "active")),
    db.select({ count: count(), total: sum(rentPayments.totalAmount) }).from(rentPayments).where(paymentFilter ? and(paymentFilter, eq(rentPayments.status, "overdue")) : eq(rentPayments.status, "overdue")),
    db.select({ count: count() }).from(maintenanceRequests).where(maintenanceFilter ? and(maintenanceFilter, or(eq(maintenanceRequests.status, "open"), eq(maintenanceRequests.status, "in_progress"))) : or(eq(maintenanceRequests.status, "open"), eq(maintenanceRequests.status, "in_progress"))),
    db.select({ total: sum(rentPayments.totalAmount) }).from(rentPayments).where(paymentFilter ? and(paymentFilter, eq(rentPayments.status, "paid")) : eq(rentPayments.status, "paid")),
  ]);

  return {
    totalProperties: totalProperties[0]?.count ?? 0,
    totalUnits: totalUnitsResult[0]?.count ?? 0,
    occupiedUnits: occupiedUnitsResult[0]?.count ?? 0,
    activeLeases: activeLeases[0]?.count ?? 0,
    overdueCount: overduePayments[0]?.count ?? 0,
    overdueAmount: Number(overduePayments[0]?.total ?? 0),
    openMaintenance: openMaintenance[0]?.count ?? 0,
    totalRentCollected: Number(recentPayments[0]?.total ?? 0),
  };
}

// ─── Accounting / Financial Reports ──────────────────────────────────────────
export async function getFinancialSummary(propertyId?: number, year?: number) {
  const db = await getDb();
  if (!db) return null;

  const currentYear = year ?? new Date().getFullYear();
  const startDate = `${currentYear}-01-01`;
  const endDate = `${currentYear}-12-31`;

  const incomeQuery = db.select({ total: sum(rentPayments.totalAmount) })
    .from(rentPayments)
    .where(and(
      eq(rentPayments.status, "paid"),
      sql`${rentPayments.paidDate} >= ${startDate}`,
      sql`${rentPayments.paidDate} <= ${endDate}`
    ));

  const expenseBaseConditions = [
    sql`${expenses.date} >= ${startDate}`,
    sql`${expenses.date} <= ${endDate}`,
  ] as any[];
  if (propertyId) expenseBaseConditions.push(eq(expenses.propertyId, propertyId));

  const expenseQuery = db.select({ total: sum(expenses.amount) })
    .from(expenses)
    .where(and(...expenseBaseConditions));

  const [incomeResult, expenseResult] = await Promise.all([incomeQuery, expenseQuery]);

  const totalIncome = Number(incomeResult[0]?.total ?? 0);
  const totalExpenses = Number(expenseResult[0]?.total ?? 0);

  return {
    totalIncome,
    totalExpenses,
    netIncome: totalIncome - totalExpenses,
    year: currentYear,
  };
}

export async function getMonthlyFinancials(year: number) {
  const db = await getDb();
  if (!db) {
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;

    return {
      month,
      monthName: new Date(year, index).toLocaleString("default", {
        month: "short",
      }),
      income: 0,
      expenses: 0,
    };
  });
}

  const months = [];
  for (let m = 1; m <= 12; m++) {
    const monthStr = String(m).padStart(2, "0");
    const startDate = `${year}-${monthStr}-01`;
    const lastDay = new Date(year, m, 0).getDate();
    const endDate = `${year}-${monthStr}-${lastDay}`;

    const [incomeResult, expenseResult, txIncomeResult, txExpenseResult] = await Promise.all([
      db.select({ total: sum(rentPayments.totalAmount) })
        .from(rentPayments)
        .where(and(
          eq(rentPayments.status, "paid"),
          sql`${rentPayments.paidDate} >= ${startDate}`,
          sql`${rentPayments.paidDate} <= ${endDate}`
        )),
      db.select({ total: sum(expenses.amount) })
        .from(expenses)
        .where(and(
          sql`${expenses.date} >= ${startDate}`,
          sql`${expenses.date} <= ${endDate}`
        )),
      db.execute(sql`SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE type = 'payment' AND date >= ${startDate} AND date <= ${endDate}`),
      db.execute(sql`SELECT COALESCE(SUM(amount),0) AS total FROM transactions WHERE type = 'expense' AND date >= ${startDate} AND date <= ${endDate}`),
    ]);

    const txIncome = Number((txIncomeResult as any)[0]?.[0]?.total ?? (txIncomeResult as any)[0]?.total ?? 0);
    const txExpense = Number((txExpenseResult as any)[0]?.[0]?.total ?? (txExpenseResult as any)[0]?.total ?? 0);

    months.push({
      month: m,
      monthName: new Date(year, m - 1).toLocaleString("default", { month: "short" }),
      income: Number(incomeResult[0]?.total ?? 0) + txIncome,
      expenses: Number(expenseResult[0]?.total ?? 0) + txExpense,
    });
  }
  return months;
}
