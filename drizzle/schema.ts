import {
  boolean,
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  date,
} from "drizzle-orm/mysql-core";

// ─── Organizations ────────────────────────────────────────────────────────────
export const organizations = mysqlTable("organizations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  plan: mysqlEnum("plan", ["trial", "starter", "pro", "enterprise"]).default("trial").notNull(),
  trialEndsAt: timestamp("trialEndsAt"),
  timezone: varchar("timezone", { length: 100 }).default("America/Chicago").notNull(),
  logoUrl: text("logoUrl"),
  themePalette: mysqlEnum("themePalette", ["forest_slate", "charcoal_sapphire", "graphite_amber", "stone_cobalt", "midnight_teal", "plum_lilac"]).default("forest_slate").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "tenant", "manager"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  inviteToken: varchar("inviteToken", { length: 128 }),
  inviteTokenExpiry: timestamp("inviteTokenExpiry"),
  inviteUsed: int("inviteUsed").default(0).notNull(),
  inviteReminderSentAt: timestamp("inviteReminderSentAt"),
  orgId: int("orgId").references(() => organizations.id),
  resetToken: varchar("resetToken", { length: 128 }),
  resetTokenExpiry: timestamp("resetTokenExpiry"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Owners ───────────────────────────────────────────────────────────────────
export const owners = mysqlTable("owners", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId").references(() => organizations.id),
  userId: int("userId").references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  company: varchar("company", { length: 255 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  zip: varchar("zip", { length: 20 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Owner = typeof owners.$inferSelect;
export type InsertOwner = typeof owners.$inferInsert;

// ─── Properties ───────────────────────────────────────────────────────────────
export const properties = mysqlTable("properties", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId").references(() => organizations.id),
  ownerId: int("ownerId").references(() => owners.id),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address").notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 50 }).notNull(),
  zip: varchar("zip", { length: 20 }).notNull(),
  country: varchar("country", { length: 50 }).default("US"),
  type: mysqlEnum("type", ["residential", "commercial", "mixed", "industrial"]).default("residential").notNull(),
  description: text("description"),
  yearBuilt: int("yearBuilt"),
  totalUnits: int("totalUnits").default(1).notNull(),
  imageUrl: text("imageUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Property = typeof properties.$inferSelect;
export type InsertProperty = typeof properties.$inferInsert;

// ─── Units ────────────────────────────────────────────────────────────────────
export const units = mysqlTable("units", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull().references(() => properties.id),
  unitNumber: varchar("unitNumber", { length: 50 }).notNull(),
  type: mysqlEnum("type", ["studio", "1br", "2br", "3br", "4br+", "commercial"]).default("1br").notNull(),
  bedrooms: int("bedrooms").default(1),
  bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }).default("1.0"),
  sqft: int("sqft"),
  floor: int("floor"),
  rentAmount: decimal("rentAmount", { precision: 10, scale: 2 }).notNull(),
  depositAmount: decimal("depositAmount", { precision: 10, scale: 2 }),
  status: mysqlEnum("status", ["vacant", "occupied", "maintenance", "unavailable"]).default("vacant").notNull(),
  amenities: text("amenities"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Unit = typeof units.$inferSelect;
export type InsertUnit = typeof units.$inferInsert;

// ─── Tenants ──────────────────────────────────────────────────────────────────
export const tenants = mysqlTable("tenants", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId").references(() => organizations.id),
  userId: int("userId").references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  dateOfBirth: date("dateOfBirth"),
  emergencyContactName: varchar("emergencyContactName", { length: 255 }),
  emergencyContactPhone: varchar("emergencyContactPhone", { length: 50 }),
  emergencyContactRelation: varchar("emergencyContactRelation", { length: 100 }),
  idType: varchar("idType", { length: 50 }),
  idNumber: varchar("idNumber", { length: 100 }),
  employerName: varchar("employerName", { length: 255 }),
  employerPhone: varchar("employerPhone", { length: 50 }),
  monthlyIncome: decimal("monthlyIncome", { precision: 10, scale: 2 }),
  notes: text("notes"),
  status: mysqlEnum("status", ["active", "inactive", "evicted"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;

// ─── Leases ───────────────────────────────────────────────────────────────────
export const leases = mysqlTable("leases", {
  id: int("id").autoincrement().primaryKey(),
  unitId: int("unitId").notNull().references(() => units.id),
  tenantId: int("tenantId").notNull().references(() => tenants.id),
  startDate: date("startDate").notNull(),
  endDate: date("endDate").notNull(),
  rentAmount: decimal("rentAmount", { precision: 10, scale: 2 }).notNull(),
  depositAmount: decimal("depositAmount", { precision: 10, scale: 2 }).notNull(),
  depositPaid: boolean("depositPaid").default(false),
  paymentDueDay: int("paymentDueDay").default(1).notNull(),
  lateFeeAmount: decimal("lateFeeAmount", { precision: 10, scale: 2 }).default("0"),
  lateFeeGraceDays: int("lateFeeGraceDays").default(5),
  status: mysqlEnum("status", ["pending", "active", "expired", "terminated"]).default("pending").notNull(),
  terms: text("terms"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Lease = typeof leases.$inferSelect;
export type InsertLease = typeof leases.$inferInsert;

// ─── Rent Payments ────────────────────────────────────────────────────────────
export const rentPayments = mysqlTable("rent_payments", {
  id: int("id").autoincrement().primaryKey(),
  leaseId: int("leaseId").notNull().references(() => leases.id),
  tenantId: int("tenantId").notNull().references(() => tenants.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  lateFee: decimal("lateFee", { precision: 10, scale: 2 }).default("0"),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull(),
  dueDate: date("dueDate").notNull(),
  paidDate: date("paidDate"),
  status: mysqlEnum("status", ["pending", "paid", "overdue", "partial", "waived"]).default("pending").notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["ach", "credit_card", "check", "cash", "other"]),
  transactionId: varchar("transactionId", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RentPayment = typeof rentPayments.$inferSelect;
export type InsertRentPayment = typeof rentPayments.$inferInsert;

// ─── Maintenance Requests ─────────────────────────────────────────────────────
export const maintenanceRequests = mysqlTable("maintenance_requests", {
  id: int("id").autoincrement().primaryKey(),
  unitId: int("unitId").notNull().references(() => units.id),
  tenantId: int("tenantId").references(() => tenants.id),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  category: mysqlEnum("category", ["plumbing", "electrical", "hvac", "appliance", "structural", "pest", "cleaning", "other"]).default("other").notNull(),
  priority: mysqlEnum("priority", ["urgent", "high", "medium", "low"]).default("medium").notNull(),
  status: mysqlEnum("status", ["open", "in_progress", "on_hold", "resolved", "cancelled"]).default("open").notNull(),
  assignedTo: varchar("assignedTo", { length: 255 }),
  estimatedCost: decimal("estimatedCost", { precision: 10, scale: 2 }),
  actualCost: decimal("actualCost", { precision: 10, scale: 2 }),
  scheduledDate: date("scheduledDate"),
  resolvedAt: timestamp("resolvedAt"),
  imageUrl: text("imageUrl"),
  imageUrls: text("imageUrls"), // JSON-serialized string[] — tenant-submitted photos
  adminImageUrls: text("adminImageUrls"), // JSON-serialized string[] — manager before/after photos
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MaintenanceRequest = typeof maintenanceRequests.$inferSelect;
export type InsertMaintenanceRequest = typeof maintenanceRequests.$inferInsert;

// ─── Expenses ─────────────────────────────────────────────────────────────────
export const expenses = mysqlTable("expenses", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull().references(() => properties.id),
  unitId: int("unitId").references(() => units.id),
  category: mysqlEnum("category", ["mortgage", "insurance", "taxes", "utilities", "maintenance", "management", "landscaping", "advertising", "legal", "supplies", "other"]).default("other").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: date("date").notNull(),
  description: varchar("description", { length: 500 }).notNull(),
  vendor: varchar("vendor", { length: 255 }),
  receiptUrl: text("receiptUrl"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;

// ─── Documents ────────────────────────────────────────────────────────────────
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  entityType: mysqlEnum("entityType", ["property", "unit", "tenant", "lease", "expense"]).notNull(),
  entityId: int("entityId").notNull(),
  propertyId: int("propertyId").references(() => properties.id),
  tenantId: int("tenantId").references(() => tenants.id),
  name: varchar("name", { length: 255 }).notNull(),
  category: mysqlEnum("category", ["lease", "addendum", "notice", "inspection", "insurance", "tax", "maintenance", "other"]).default("other").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  mimeType: varchar("mimeType", { length: 100 }),
  fileSize: int("fileSize"),
  shareToken: varchar("shareToken", { length: 64 }).unique(),
  shareExpiresAt: timestamp("shareExpiresAt"),
  uploadedBy: int("uploadedBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

// ═══════════════════════════════════════════════════════════════════════════════
// DoorLoop-Style v2 Tables
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Vendors ──────────────────────────────────────────────────────────────────
export const vendors = mysqlTable("vendors", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId").references(() => organizations.id),
  name: varchar("name", { length: 255 }).notNull(),
  company: varchar("company", { length: 255 }),
  specialties: text("specialties"),
  preferredProvider: boolean("preferredProvider").default(false).notNull(),
  serviceAreas: text("serviceAreas"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  category: mysqlEnum("category", ["plumbing", "electrical", "hvac", "general", "landscaping", "cleaning", "pest", "appliance", "roofing", "legal", "accounting", "other"]).default("general").notNull(),
  address: text("address"),
  taxId: varchar("taxId", { length: 100 }),
  insuranceExpiry: date("insuranceExpiry"),
  notes: text("notes"),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Vendor = typeof vendors.$inferSelect;
export type InsertVendor = typeof vendors.$inferInsert;

// ─── Vendor Insurance Certificates ────────────────────────────────────────────
export const vendorInsuranceCertificates = mysqlTable("vendor_insurance_certificates", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId").notNull().references(() => organizations.id),
  vendorId: int("vendorId").notNull().references(() => vendors.id),
  name: varchar("name", { length: 255 }).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  mimeType: varchar("mimeType", { length: 100 }),
  fileSize: int("fileSize"),
  expiresAt: date("expiresAt").notNull(),
  lastReminderStage: int("lastReminderStage"),
  lastReminderSentAt: timestamp("lastReminderSentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type VendorInsuranceCertificate = typeof vendorInsuranceCertificates.$inferSelect;
export type InsertVendorInsuranceCertificate = typeof vendorInsuranceCertificates.$inferInsert;

// ─── Vendor Performance Notes ─────────────────────────────────────────────────
export const vendorPerformanceNotes = mysqlTable("vendor_performance_notes", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId").notNull().references(() => organizations.id),
  vendorId: int("vendorId").notNull().references(() => vendors.id),
  note: text("note").notNull(),
  rating: int("rating"),
  authorId: int("authorId").references(() => users.id),
  authorName: varchar("authorName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type VendorPerformanceNote = typeof vendorPerformanceNotes.$inferSelect;
export type InsertVendorPerformanceNote = typeof vendorPerformanceNotes.$inferInsert;

// ─── Prospects ────────────────────────────────────────────────────────────────
export const prospects = mysqlTable("prospects", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  propertyId: int("propertyId").references(() => properties.id),
  unitId: int("unitId").references(() => units.id),
  leadSource: mysqlEnum("leadSource", ["website", "zillow", "referral", "walk_in", "phone", "social", "other"]).default("website").notNull(),
  stage: mysqlEnum("stage", ["new", "contacted", "showing", "application", "approved", "lost", "leased"]).default("new").notNull(),
  notes: text("notes"),
  assignedTo: int("assignedTo").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Prospect = typeof prospects.$inferSelect;
export type InsertProspect = typeof prospects.$inferInsert;

// ─── Tasks ────────────────────────────────────────────────────────────────────
export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["task", "tenant_request", "owner_request", "internal"]).default("task").notNull(),
  requestKind: mysqlEnum("requestKind", ["general", "maintenance"]).default("general"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  propertyId: int("propertyId").references(() => properties.id),
  unitId: int("unitId").references(() => units.id),
  tenantId: int("tenantId").references(() => tenants.id),
  category: mysqlEnum("category", ["plumbing", "electrical", "hvac", "appliance", "structural", "pest", "cleaning", "general", "other"]).default("general").notNull(),
  priority: mysqlEnum("priority", ["urgent", "high", "medium", "low"]).default("medium").notNull(),
  status: mysqlEnum("status", ["not_started", "in_progress", "on_hold", "completed", "overdue"]).default("not_started").notNull(),
  assignedTo: int("assignedTo").references(() => users.id),
  assigneeName: varchar("assigneeName", { length: 255 }),
  dueDate: date("dueDate"),
  aiSummary: text("aiSummary"),
  accessToProperty: boolean("accessToProperty").default(false),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

// ─── Task Updates (activity log on a task) ─────────────────────────────────────
export const taskUpdates = mysqlTable("task_updates", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").notNull().references(() => tasks.id),
  message: text("message").notNull(),
  authorId: int("authorId").references(() => users.id),
  authorName: varchar("authorName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type TaskUpdate = typeof taskUpdates.$inferSelect;
export type InsertTaskUpdate = typeof taskUpdates.$inferInsert;

// ─── Work Orders ──────────────────────────────────────────────────────────────
export const workOrders = mysqlTable("work_orders", {
  id: int("id").autoincrement().primaryKey(),
  taskId: int("taskId").references(() => tasks.id),
  vendorId: int("vendorId").references(() => vendors.id),
  propertyId: int("propertyId").references(() => properties.id),
  unitId: int("unitId").references(() => units.id),
  subject: varchar("subject", { length: 255 }).notNull(),
  workDescription: text("workDescription"),
  isRecurring: boolean("isRecurring").default(false).notNull(),
  startDate: date("startDate"),
  endDate: date("endDate"),
  frequency: mysqlEnum("frequency", ["daily", "weekly", "biweekly", "monthly", "quarterly", "yearly"]),
  dueDate: date("dueDate"),
  priority: mysqlEnum("priority", ["urgent", "high", "medium", "low"]).default("medium").notNull(),
  status: mysqlEnum("status", ["open", "in_progress", "completed", "cancelled"]).default("open").notNull(),
  assigneeName: varchar("assigneeName", { length: 255 }),
  accessToProperty: boolean("accessToProperty").default(false),
  approvedByOwner: boolean("approvedByOwner").default(false),
  billAmount: decimal("billAmount", { precision: 10, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type WorkOrder = typeof workOrders.$inferSelect;
export type InsertWorkOrder = typeof workOrders.$inferInsert;

// ─── Bank Accounts ────────────────────────────────────────────────────────────
export const bankAccounts = mysqlTable("bank_accounts", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId").references(() => organizations.id),
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["operating", "security_deposit", "trust", "reserve"]).default("operating").notNull(),
  accountNumberMask: varchar("accountNumberMask", { length: 20 }),
  bankBalance: decimal("bankBalance", { precision: 14, scale: 2 }).default("0").notNull(),
  bookBalance: decimal("bookBalance", { precision: 14, scale: 2 }).default("0").notNull(),
  isConnected: boolean("isConnected").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type BankAccount = typeof bankAccounts.$inferSelect;
export type InsertBankAccount = typeof bankAccounts.$inferInsert;

// ─── Transactions (charges, payments, expenses, deposits, credits, refunds) ────
export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("orgId").references(() => organizations.id),
  type: mysqlEnum("type", ["charge", "payment", "expense", "deposit", "credit", "refund", "bill", "owner_contribution", "owner_distribution", "journal_entry", "bank_transfer"]).notNull(),
  date: date("date").notNull(),
  leaseId: int("leaseId").references(() => leases.id),
  tenantId: int("tenantId").references(() => tenants.id),
  propertyId: int("propertyId").references(() => properties.id),
  unitId: int("unitId").references(() => units.id),
  vendorId: int("vendorId").references(() => vendors.id),
  ownerId: int("ownerId").references(() => owners.id),
  bankAccountId: int("bankAccountId").references(() => bankAccounts.id),
  category: varchar("category", { length: 100 }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  description: varchar("description", { length: 500 }),
  reference: varchar("reference", { length: 100 }),
  paymentMethod: mysqlEnum("paymentMethod", ["cash", "check", "credit_card", "cashiers_check", "money_order", "eft", "ach", "debit_card"]),
  status: mysqlEnum("status", ["pending", "paid", "partial", "overdue", "cleared", "void", "received"]).default("pending").notNull(),
  memo: text("memo"),
  receiptUrl: text("receiptUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

// ─── Transaction Line Items (multi-line charges: Rent, CAM, Property Taxes) ─────
export const transactionLineItems = mysqlTable("transaction_line_items", {
  id: int("id").autoincrement().primaryKey(),
  transactionId: int("transactionId").notNull().references(() => transactions.id),
  account: varchar("account", { length: 100 }).notNull(),
  description: varchar("description", { length: 500 }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type TransactionLineItem = typeof transactionLineItems.$inferSelect;
export type InsertTransactionLineItem = typeof transactionLineItems.$inferInsert;

// ─── Recurring Charges (recurring rent + CAM + future increases) ───────────────
export const recurringCharges = mysqlTable("recurring_charges", {
  id: int("id").autoincrement().primaryKey(),
  leaseId: int("leaseId").notNull().references(() => leases.id),
  account: varchar("account", { length: 100 }).notNull(),
  description: varchar("description", { length: 500 }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  frequency: mysqlEnum("frequency", ["monthly", "quarterly", "yearly", "weekly"]).default("monthly").notNull(),
  startDate: date("startDate").notNull(),
  endDate: date("endDate"),
  effectiveDate: date("effectiveDate"),
  isIncrease: boolean("isIncrease").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type RecurringCharge = typeof recurringCharges.$inferSelect;
export type InsertRecurringCharge = typeof recurringCharges.$inferInsert;

// ─── Announcements ────────────────────────────────────────────────────────────
export const announcements = mysqlTable("announcements", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  propertyId: int("propertyId").references(() => properties.id),
  audience: mysqlEnum("audience", ["all_tenants", "property", "specific"]).default("all_tenants").notNull(),
  sentBy: int("sentBy").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = typeof announcements.$inferInsert;

// ─── Calendar Events ──────────────────────────────────────────────────────────
export const calendarEvents = mysqlTable("calendar_events", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["move_in", "move_out", "lease_expiration", "inspection", "task", "showing", "other"]).default("other").notNull(),
  date: date("date").notNull(),
  propertyId: int("propertyId").references(() => properties.id),
  unitId: int("unitId").references(() => units.id),
  relatedId: int("relatedId"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = typeof calendarEvents.$inferInsert;

// ─── Rental Applications ──────────────────────────────────────────────────────
export const rentalApplications = mysqlTable("rental_applications", {
  id: int("id").autoincrement().primaryKey(),
  prospectId: int("prospectId").references(() => prospects.id),
  applicantName: varchar("applicantName", { length: 255 }).notNull(),
  applicantEmail: varchar("applicantEmail", { length: 320 }),
  applicantPhone: varchar("applicantPhone", { length: 50 }),
  propertyId: int("propertyId").references(() => properties.id),
  unitId: int("unitId").references(() => units.id),
  monthlyIncome: decimal("monthlyIncome", { precision: 10, scale: 2 }),
  desiredMoveIn: date("desiredMoveIn"),
  status: mysqlEnum("status", ["pending", "screening", "approved", "denied", "withdrawn"]).default("pending").notNull(),
  screeningScore: int("screeningScore"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type RentalApplication = typeof rentalApplications.$inferSelect;
export type InsertRentalApplication = typeof rentalApplications.$inferInsert;

// ─── Inspections ──────────────────────────────────────────────────────────────
export const inspections = mysqlTable("inspections", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").references(() => properties.id),
  unitId: int("unitId").references(() => units.id),
  type: mysqlEnum("type", ["move_in", "move_out", "routine", "drive_by", "annual"]).default("routine").notNull(),
  scheduledDate: date("scheduledDate"),
  completedDate: date("completedDate"),
  status: mysqlEnum("status", ["scheduled", "in_progress", "completed", "cancelled"]).default("scheduled").notNull(),
  inspectorName: varchar("inspectorName", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Inspection = typeof inspections.$inferSelect;
export type InsertInspection = typeof inspections.$inferInsert;

// ─── AutoPay Settings (tenant portal) ──────────────────────────────────────────
export const autopaySettings = mysqlTable("autopay_settings", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull().references(() => tenants.id),
  leaseId: int("leaseId").references(() => leases.id),
  enabled: boolean("enabled").default(false).notNull(),
  dayOfMonth: int("dayOfMonth").default(1).notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["bank_account", "credit_card"]).default("bank_account").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AutopaySetting = typeof autopaySettings.$inferSelect;
export type InsertAutopaySetting = typeof autopaySettings.$inferInsert;
