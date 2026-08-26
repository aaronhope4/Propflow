import { and, desc, eq, sql, count, sum, or, gte, lte, inArray } from "drizzle-orm";
import { getDb } from "./db";
import {
  vendors, InsertVendor,
  vendorInsuranceCertificates, InsertVendorInsuranceCertificate,
  vendorPerformanceNotes, InsertVendorPerformanceNote,
  prospects, InsertProspect,
  tasks, InsertTask,
  taskUpdates, InsertTaskUpdate,
  workOrders, InsertWorkOrder,
  bankAccounts, InsertBankAccount,
  transactions, InsertTransaction,
  transactionLineItems, InsertTransactionLineItem,
  recurringCharges, InsertRecurringCharge,
  announcements, InsertAnnouncement,
  calendarEvents, InsertCalendarEvent,
  rentalApplications, InsertRentalApplication,
  inspections, InsertInspection,
  autopaySettings, InsertAutopaySetting,
  properties, units, leases, tenants, owners, users,
} from "../drizzle/schema";

// ═══════════════════════════════════════════════════════════════════════════════
// Vendors
// ═══════════════════════════════════════════════════════════════════════════════
export async function getVendors(orgId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(vendors).where(eq(vendors.orgId, orgId)).orderBy(vendors.company, vendors.name);
}
export async function getVendorById(id: number, orgId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db.select().from(vendors).where(and(eq(vendors.id, id), eq(vendors.orgId, orgId))).limit(1);
  return r[0];
}
export async function createVendor(data: InsertVendor) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(vendors).values(data);
}
export async function updateVendor(id: number, orgId: number, data: Partial<InsertVendor>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(vendors).set(data).where(and(eq(vendors.id, id), eq(vendors.orgId, orgId)));
}
export async function deleteVendor(id: number, orgId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  // Preserve work-order history while releasing the deleted provider assignment.
  await db.update(workOrders).set({ vendorId: null }).where(eq(workOrders.vendorId, id));
  await db.delete(vendorPerformanceNotes).where(and(eq(vendorPerformanceNotes.vendorId, id), eq(vendorPerformanceNotes.orgId, orgId)));
  await db.delete(vendorInsuranceCertificates).where(and(eq(vendorInsuranceCertificates.vendorId, id), eq(vendorInsuranceCertificates.orgId, orgId)));
  await db.delete(vendors).where(and(eq(vendors.id, id), eq(vendors.orgId, orgId)));
}

export async function getVendorCertificates(vendorId: number, orgId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(vendorInsuranceCertificates)
    .where(and(eq(vendorInsuranceCertificates.vendorId, vendorId), eq(vendorInsuranceCertificates.orgId, orgId)))
    .orderBy(vendorInsuranceCertificates.expiresAt);
}

export async function createVendorCertificate(data: InsertVendorInsuranceCertificate) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result: any = await db.insert(vendorInsuranceCertificates).values(data);
  return result[0]?.insertId as number | undefined;
}

export async function deleteVendorCertificate(id: number, orgId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(vendorInsuranceCertificates).where(and(eq(vendorInsuranceCertificates.id, id), eq(vendorInsuranceCertificates.orgId, orgId)));
}

export async function getVendorPerformanceNotes(vendorId: number, orgId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(vendorPerformanceNotes)
    .where(and(eq(vendorPerformanceNotes.vendorId, vendorId), eq(vendorPerformanceNotes.orgId, orgId)))
    .orderBy(desc(vendorPerformanceNotes.createdAt));
}

export async function createVendorPerformanceNote(data: InsertVendorPerformanceNote) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(vendorPerformanceNotes).values(data);
}

export async function deleteVendorPerformanceNote(id: number, orgId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(vendorPerformanceNotes).where(and(eq(vendorPerformanceNotes.id, id), eq(vendorPerformanceNotes.orgId, orgId)));
}

export async function getVendorCompliance(orgId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: vendorInsuranceCertificates.id,
    vendorId: vendorInsuranceCertificates.vendorId,
    vendorName: vendors.name,
    vendorCompany: vendors.company,
    certificateName: vendorInsuranceCertificates.name,
    expiresAt: vendorInsuranceCertificates.expiresAt,
    fileUrl: vendorInsuranceCertificates.fileUrl,
    lastReminderStage: vendorInsuranceCertificates.lastReminderStage,
  }).from(vendorInsuranceCertificates)
    .innerJoin(vendors, eq(vendorInsuranceCertificates.vendorId, vendors.id))
    .where(and(eq(vendorInsuranceCertificates.orgId, orgId), eq(vendors.status, "active")))
    .orderBy(vendorInsuranceCertificates.expiresAt);
}

export async function getVendorInsuranceReminderCandidates() {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: vendorInsuranceCertificates.id,
    orgId: vendorInsuranceCertificates.orgId,
    certificateName: vendorInsuranceCertificates.name,
    expiresAt: vendorInsuranceCertificates.expiresAt,
    lastReminderStage: vendorInsuranceCertificates.lastReminderStage,
    vendorName: vendors.name,
    vendorCompany: vendors.company,
  }).from(vendorInsuranceCertificates)
    .innerJoin(vendors, eq(vendorInsuranceCertificates.vendorId, vendors.id))
    .where(eq(vendors.status, "active"));
}

export async function markVendorCertificateReminder(id: number, stage: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(vendorInsuranceCertificates).set({ lastReminderStage: stage, lastReminderSentAt: new Date() }).where(eq(vendorInsuranceCertificates.id, id));
}

export async function getOrganizationAdminRecipients(orgId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ email: users.email, name: users.name }).from(users)
    .where(and(eq(users.orgId, orgId), eq(users.role, "admin")));
}

// ═══════════════════════════════════════════════════════════════════════════════
// Prospects
// ═══════════════════════════════════════════════════════════════════════════════
export async function getProspects() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(prospects).orderBy(desc(prospects.createdAt));
}
export async function getProspectById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db.select().from(prospects).where(eq(prospects.id, id)).limit(1);
  return r[0];
}
export async function createProspect(data: InsertProspect) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(prospects).values(data);
}
export async function updateProspect(id: number, data: Partial<InsertProspect>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(prospects).set(data).where(eq(prospects.id, id));
}
export async function deleteProspect(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(prospects).where(eq(prospects.id, id));
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tasks
// ═══════════════════════════════════════════════════════════════════════════════
export async function getTasks(filters?: { type?: string; status?: string; tenantId?: number; propertyId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (filters?.type) conditions.push(eq(tasks.type, filters.type as any));
  if (filters?.status) conditions.push(eq(tasks.status, filters.status as any));
  if (filters?.tenantId) conditions.push(eq(tasks.tenantId, filters.tenantId));
  if (filters?.propertyId) conditions.push(eq(tasks.propertyId, filters.propertyId));
  const q = db.select().from(tasks);
  if (conditions.length) return q.where(and(...conditions)).orderBy(desc(tasks.createdAt));
  return q.orderBy(desc(tasks.createdAt));
}
export async function getTaskById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return r[0];
}
export async function createTask(data: InsertTask) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const r: any = await db.insert(tasks).values(data);
  return r[0]?.insertId as number | undefined;
}
export async function updateTask(id: number, data: Partial<InsertTask>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(tasks).set(data).where(eq(tasks.id, id));
}
export async function deleteTask(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(tasks).where(eq(tasks.id, id));
}

// Task updates
export async function getTaskUpdates(taskId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(taskUpdates).where(eq(taskUpdates.taskId, taskId)).orderBy(desc(taskUpdates.createdAt));
}
export async function createTaskUpdate(data: InsertTaskUpdate) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(taskUpdates).values(data);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Work Orders
// ═══════════════════════════════════════════════════════════════════════════════
export async function getWorkOrders(filters?: { status?: string; vendorId?: number; propertyId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (filters?.status) conditions.push(eq(workOrders.status, filters.status as any));
  if (filters?.vendorId) conditions.push(eq(workOrders.vendorId, filters.vendorId));
  if (filters?.propertyId) conditions.push(eq(workOrders.propertyId, filters.propertyId));
  const q = db.select().from(workOrders);
  if (conditions.length) return q.where(and(...conditions)).orderBy(desc(workOrders.createdAt));
  return q.orderBy(desc(workOrders.createdAt));
}
export async function getWorkOrderById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db.select().from(workOrders).where(eq(workOrders.id, id)).limit(1);
  return r[0];
}
export async function createWorkOrder(data: InsertWorkOrder) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(workOrders).values(data);
}
export async function updateWorkOrder(id: number, data: Partial<InsertWorkOrder>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(workOrders).set(data).where(eq(workOrders.id, id));
}
export async function deleteWorkOrder(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(workOrders).where(eq(workOrders.id, id));
}

// ═══════════════════════════════════════════════════════════════════════════════
// Bank Accounts
// ═══════════════════════════════════════════════════════════════════════════════
export async function getBankAccounts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bankAccounts).orderBy(bankAccounts.name);
}
export async function getBankAccountById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db.select().from(bankAccounts).where(eq(bankAccounts.id, id)).limit(1);
  return r[0];
}
export async function createBankAccount(data: InsertBankAccount) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(bankAccounts).values(data);
}
export async function updateBankAccount(id: number, data: Partial<InsertBankAccount>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(bankAccounts).set(data).where(eq(bankAccounts.id, id));
}

// ═══════════════════════════════════════════════════════════════════════════════
// Transactions + Line Items
// ═══════════════════════════════════════════════════════════════════════════════
export async function getTransactions(filters?: {
  type?: string; types?: string[]; leaseId?: number; tenantId?: number;
  propertyId?: number; vendorId?: number; ownerId?: number; bankAccountId?: number;
  startDate?: string; endDate?: string; status?: string;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (filters?.type) conditions.push(eq(transactions.type, filters.type as any));
  if (filters?.types?.length) conditions.push(inArray(transactions.type, filters.types as any));
  if (filters?.leaseId) conditions.push(eq(transactions.leaseId, filters.leaseId));
  if (filters?.tenantId) conditions.push(eq(transactions.tenantId, filters.tenantId));
  if (filters?.propertyId) conditions.push(eq(transactions.propertyId, filters.propertyId));
  if (filters?.vendorId) conditions.push(eq(transactions.vendorId, filters.vendorId));
  if (filters?.ownerId) conditions.push(eq(transactions.ownerId, filters.ownerId));
  if (filters?.bankAccountId) conditions.push(eq(transactions.bankAccountId, filters.bankAccountId));
  if (filters?.status) conditions.push(eq(transactions.status, filters.status as any));
  if (filters?.startDate) conditions.push(sql`${transactions.date} >= ${filters.startDate}`);
  if (filters?.endDate) conditions.push(sql`${transactions.date} <= ${filters.endDate}`);
  const q = db.select().from(transactions);
  if (conditions.length) return q.where(and(...conditions)).orderBy(desc(transactions.date), desc(transactions.id));
  return q.orderBy(desc(transactions.date), desc(transactions.id));
}
export async function getTransactionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
  return r[0];
}
export async function createTransaction(data: InsertTransaction): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const r: any = await db.insert(transactions).values(data);
  return r[0]?.insertId as number;
}
export async function updateTransaction(id: number, data: Partial<InsertTransaction>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(transactions).set(data).where(eq(transactions.id, id));
}
export async function deleteTransaction(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(transactionLineItems).where(eq(transactionLineItems.transactionId, id));
  await db.delete(transactions).where(eq(transactions.id, id));
}
export async function getLineItems(transactionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(transactionLineItems).where(eq(transactionLineItems.transactionId, transactionId));
}
export async function createLineItem(data: InsertTransactionLineItem) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(transactionLineItems).values(data);
}

// Lease ledger: charges (+) and payments/credits (-), with running balance
export async function getLeaseLedger(leaseId: number) {
  const db = await getDb();
  if (!db) return [];
  const txns = await db.select().from(transactions)
    .where(eq(transactions.leaseId, leaseId))
    .orderBy(transactions.date, transactions.id);
  let running = 0;
  return txns.map((t) => {
    const amt = Number(t.amount);
    // charges increase balance owed; payments/credits/refunds decrease it
    if (t.type === "charge") running += amt;
    else if (t.type === "payment" || t.type === "credit") running -= amt;
    else if (t.type === "refund") running += amt;
    return { ...t, runningBalance: running };
  });
}

export async function getOutstandingBalanceByLease() {
  const db = await getDb();
  if (!db) return [];
  // Sum charges minus payments/credits grouped by lease
  const rows = await db.select({
    leaseId: transactions.leaseId,
    tenantId: transactions.tenantId,
    propertyId: transactions.propertyId,
    unitId: transactions.unitId,
    charges: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'charge' THEN ${transactions.amount} ELSE 0 END), 0)`,
    payments: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} IN ('payment','credit') THEN ${transactions.amount} ELSE 0 END), 0)`,
  }).from(transactions).where(sql`${transactions.leaseId} IS NOT NULL`).groupBy(transactions.leaseId, transactions.tenantId, transactions.propertyId, transactions.unitId);
  return rows.map((r) => ({ ...r, balance: Number(r.charges) - Number(r.payments) })).filter((r) => r.balance > 0.001);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Recurring Charges
// ═══════════════════════════════════════════════════════════════════════════════
export async function getRecurringCharges(leaseId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(recurringCharges).where(eq(recurringCharges.leaseId, leaseId)).orderBy(recurringCharges.effectiveDate);
}
export async function createRecurringCharge(data: InsertRecurringCharge) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(recurringCharges).values(data);
}
export async function deleteRecurringCharge(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(recurringCharges).where(eq(recurringCharges.id, id));
}

// ═══════════════════════════════════════════════════════════════════════════════
// Announcements
// ═══════════════════════════════════════════════════════════════════════════════
export async function getAnnouncements() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(announcements).orderBy(desc(announcements.createdAt));
}
export async function createAnnouncement(data: InsertAnnouncement) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(announcements).values(data);
}
export async function deleteAnnouncement(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(announcements).where(eq(announcements.id, id));
}

// ═══════════════════════════════════════════════════════════════════════════════
// Calendar Events
// ═══════════════════════════════════════════════════════════════════════════════
export async function getCalendarEvents(startDate?: string, endDate?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (startDate) conditions.push(sql`${calendarEvents.date} >= ${startDate}`);
  if (endDate) conditions.push(sql`${calendarEvents.date} <= ${endDate}`);
  const q = db.select().from(calendarEvents);
  if (conditions.length) return q.where(and(...conditions)).orderBy(calendarEvents.date);
  return q.orderBy(calendarEvents.date);
}
export async function createCalendarEvent(data: InsertCalendarEvent) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(calendarEvents).values(data);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Rental Applications
// ═══════════════════════════════════════════════════════════════════════════════
export async function getRentalApplications() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(rentalApplications).orderBy(desc(rentalApplications.createdAt));
}
export async function createRentalApplication(data: InsertRentalApplication) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(rentalApplications).values(data);
}
export async function updateRentalApplication(id: number, data: Partial<InsertRentalApplication>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(rentalApplications).set(data).where(eq(rentalApplications.id, id));
}

// ═══════════════════════════════════════════════════════════════════════════════
// Inspections
// ═══════════════════════════════════════════════════════════════════════════════
export async function getInspections(propertyId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (propertyId) return db.select().from(inspections).where(eq(inspections.propertyId, propertyId)).orderBy(desc(inspections.scheduledDate));
  return db.select().from(inspections).orderBy(desc(inspections.scheduledDate));
}
export async function createInspection(data: InsertInspection) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(inspections).values(data);
}
export async function updateInspection(id: number, data: Partial<InsertInspection>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(inspections).set(data).where(eq(inspections.id, id));
}

// ═══════════════════════════════════════════════════════════════════════════════
// AutoPay
// ═══════════════════════════════════════════════════════════════════════════════
export async function getAutopayByTenant(tenantId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const r = await db.select().from(autopaySettings).where(eq(autopaySettings.tenantId, tenantId)).limit(1);
  return r[0];
}
export async function upsertAutopay(data: InsertAutopaySetting) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const existing = await db.select().from(autopaySettings).where(eq(autopaySettings.tenantId, data.tenantId)).limit(1);
  if (existing[0]) {
    await db.update(autopaySettings).set(data).where(eq(autopaySettings.id, existing[0].id));
  } else {
    await db.insert(autopaySettings).values(data);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Reports: Profit & Loss (income & expenses by property, from transactions)
// ═══════════════════════════════════════════════════════════════════════════════
export async function getProfitAndLoss(filters: {
  startDate: string;
  endDate: string;
  propertyId?: number;
}) {
  const db = await getDb();

  if (!db) {
    return {
      income: [],
      expenses: [],
    };
  }

  // Income = charges that are paid (we use payment transactions allocated to accounts via line items on charges)
  // Simplified: income accounts come from CHARGE line items; expenses from EXPENSE transactions category.
  const propConds: any[] = [
    sql`${transactions.date} >= ${filters.startDate}`,
    sql`${transactions.date} <= ${filters.endDate}`,
  ];
  if (filters.propertyId) propConds.push(eq(transactions.propertyId, filters.propertyId));

  // Income from charge line items joined to transactions
  const incomeRows = await db.select({
    propertyId: transactions.propertyId,
    account: transactionLineItems.account,
    amount: sql<number>`COALESCE(SUM(${transactionLineItems.amount}),0)`,
  })
    .from(transactionLineItems)
    .innerJoin(transactions, eq(transactionLineItems.transactionId, transactions.id))
    .where(and(eq(transactions.type, "charge"), ...propConds))
    .groupBy(transactions.propertyId, transactionLineItems.account);

  // Charges without line items (fallback): use transaction category
  const incomeFallback = await db.select({
    propertyId: transactions.propertyId,
    account: transactions.category,
    amount: sql<number>`COALESCE(SUM(${transactions.amount}),0)`,
  })
    .from(transactions)
    .where(and(
      eq(transactions.type, "charge"),
      sql`NOT EXISTS (SELECT 1 FROM transaction_line_items tli WHERE tli.transactionId = ${transactions.id})`,
      ...propConds,
    ))
    .groupBy(transactions.propertyId, transactions.category);

  const expenseConds: any[] = [
    sql`${transactions.date} >= ${filters.startDate}`,
    sql`${transactions.date} <= ${filters.endDate}`,
    eq(transactions.type, "expense"),
  ];
  if (filters.propertyId) expenseConds.push(eq(transactions.propertyId, filters.propertyId));
  const expenseRows = await db.select({
    propertyId: transactions.propertyId,
    account: transactions.category,
    amount: sql<number>`COALESCE(SUM(${transactions.amount}),0)`,
  })
    .from(transactions)
    .where(and(...expenseConds))
    .groupBy(transactions.propertyId, transactions.category);

  return {
    income: [...incomeRows, ...incomeFallback].map((r) => ({ ...r, amount: Number(r.amount) })),
    expenses: expenseRows.map((r) => ({ ...r, amount: Number(r.amount) })),
  };
}

// A/R Aging: outstanding charges grouped by age bucket
export async function getArAging(asOf: string) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(transactions)
    .where(and(eq(transactions.type, "charge"), or(eq(transactions.status, "pending"), eq(transactions.status, "overdue"), eq(transactions.status, "partial"))))
    .orderBy(transactions.date);
  return rows;
}

// CAM Reconciliation: for a property+period, allocate recoverable expenses by sqft pro-rata
export async function getCamReconciliation(filters: { propertyId: number; startDate: string; endDate: string; recoverableAccounts: string[] }) {
  const db = await getDb();
  if (!db) return null;

  const propUnits = await db.select().from(units).where(eq(units.propertyId, filters.propertyId));
  const totalSqft = propUnits.reduce((s, u) => s + (u.sqft ?? 0), 0) || 1;

  // recoverable expenses for the property in period matching recoverable accounts
  const expConds: any[] = [
    eq(transactions.type, "expense"),
    eq(transactions.propertyId, filters.propertyId),
    sql`${transactions.date} >= ${filters.startDate}`,
    sql`${transactions.date} <= ${filters.endDate}`,
  ];
  if (filters.recoverableAccounts.length) expConds.push(inArray(transactions.category, filters.recoverableAccounts));
  const expRows = await db.select().from(transactions).where(and(...expConds));
  const totalRecoverable = expRows.reduce((s, e) => s + Number(e.amount), 0);

  // active leases on the property
  const propLeases = await db.select({
    leaseId: leases.id, unitId: leases.unitId, tenantId: leases.tenantId,
    unitNumber: units.unitNumber, sqft: units.sqft, tenantName: tenants.name,
  })
    .from(leases)
    .innerJoin(units, eq(leases.unitId, units.id))
    .innerJoin(tenants, eq(leases.tenantId, tenants.id))
    .where(and(eq(units.propertyId, filters.propertyId), eq(leases.status, "active")));

  // CAM estimated paid: sum of CAM charge line items per lease in period
  const camPaidRows = await db.select({
    leaseId: transactions.leaseId,
    paid: sql<number>`COALESCE(SUM(${transactionLineItems.amount}),0)`,
  })
    .from(transactionLineItems)
    .innerJoin(transactions, eq(transactionLineItems.transactionId, transactions.id))
    .where(and(
      eq(transactions.type, "charge"),
      eq(transactions.propertyId, filters.propertyId),
      sql`${transactions.date} >= ${filters.startDate}`,
      sql`${transactions.date} <= ${filters.endDate}`,
      sql`LOWER(${transactionLineItems.account}) LIKE '%cam%'`,
    ))
    .groupBy(transactions.leaseId);
  const camPaidMap = new Map<number, number>();
  for (const r of camPaidRows) if (r.leaseId) camPaidMap.set(r.leaseId, Number(r.paid));

  const rows = propLeases.map((l) => {
    const sqft = l.sqft ?? 0;
    const proRata = sqft / totalSqft;
    const camShare = totalRecoverable * proRata;
    const estPaid = camPaidMap.get(l.leaseId) ?? 0;
    const trueUp = camShare - estPaid;
    return {
      tenantName: l.tenantName,
      unitNumber: l.unitNumber,
      sqft,
      proRataPct: proRata * 100,
      camShare,
      estPaid,
      trueUp,
    };
  });

  return {
    totalRecoverable,
    totalSqft,
    expenseBreakdown: expRows.map((e) => ({ account: e.category, amount: Number(e.amount) })),
    rows,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Overview Dashboard widgets data
// ═══════════════════════════════════════════════════════════════════════════════
export async function getOverviewData() {
  const db = await getDb();
  if (!db) return null;

  const [
    propCount, unitRows, leaseActive,
    recentPaymentTxns, recentRequests, openTasks,
  ] = await Promise.all([
    db.select({ c: count() }).from(properties),
    db.select().from(units),
    db.select({ c: count() }).from(leases).where(eq(leases.status, "active")),
    db.select().from(transactions).where(eq(transactions.type, "payment")).orderBy(desc(transactions.date)).limit(6),
    db.select().from(tasks).where(eq(tasks.type, "tenant_request")).orderBy(desc(tasks.createdAt)).limit(6),
    db.select().from(tasks).where(or(eq(tasks.status, "not_started"), eq(tasks.status, "in_progress"), eq(tasks.status, "overdue"))).orderBy(desc(tasks.createdAt)).limit(6),
  ]);

  const totalUnits = unitRows.length;
  const occupied = unitRows.filter((u) => u.status === "occupied").length;
  const vacant = unitRows.filter((u) => u.status === "vacant").length;
  const totalSqft = unitRows.reduce((s, u) => s + (u.sqft ?? 0), 0);

  // vacancies by property
  const props = await db.select().from(properties);
  const vacByProp = props.map((p) => {
    const pUnits = unitRows.filter((u) => u.propertyId === p.id);
    return { property: p.name, vacant: pUnits.filter((u) => u.status === "vacant").length, total: pUnits.length };
  });

  return {
    stats: { properties: propCount[0]?.c ?? 0, units: totalUnits, sqft: totalSqft, occupied, vacant, activeLeases: leaseActive[0]?.c ?? 0 },
    occupancy: { occupied, vacant, total: totalUnits },
    vacByProp,
    recentPayments: recentPaymentTxns,
    recentRequests,
    openTasks,
  };
}

export { gte, lte };
