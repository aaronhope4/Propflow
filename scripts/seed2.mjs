import mysql from "mysql2/promise";

const c = await mysql.createConnection(process.env.DATABASE_URL);
const today = new Date();
const d = (dt) => dt.toISOString().slice(0, 10);
const daysAgo = (n) => { const x = new Date(today); x.setDate(x.getDate() - n); return d(x); };
const daysAhead = (n) => { const x = new Date(today); x.setDate(x.getDate() + n); return d(x); };

// Idempotent: clear v2 tables (children first)
const clearOrder = [
  "transaction_line_items", "transactions", "recurring_charges",
  "work_orders", "task_updates", "tasks",
  "rental_applications", "prospects", "inspections",
  "calendar_events", "announcements", "autopay_settings",
  "bank_accounts", "vendors",
];
for (const t of clearOrder) {
  await c.query(`DELETE FROM ${t}`);
}
console.log("Cleared v2 tables");

// Reference data from existing DB
const props = [
  { id: 1, name: "Riverside Apartments" },
  { id: 2, name: "Oak Street Townhomes" },
  { id: 3, name: "Downtown Office Suite" },
];
const units = [
  { id: 1, propertyId: 1, rent: 1450, sqft: 750 }, { id: 2, propertyId: 1, rent: 1850, sqft: 1050 },
  { id: 3, propertyId: 1, rent: 1950, sqft: 1100 }, { id: 4, propertyId: 1, rent: 2400, sqft: 1400 },
  { id: 5, propertyId: 2, rent: 2100, sqft: 1200 }, { id: 6, propertyId: 2, rent: 2700, sqft: 1600 },
  { id: 7, propertyId: 2, rent: 2100, sqft: 1200 }, { id: 8, propertyId: 3, rent: 4500, sqft: 2000 },
  { id: 9, propertyId: 3, rent: 2800, sqft: 1200 },
];
const leases = [
  { id: 1, unitId: 1, tenantId: 1, rent: 1450 }, { id: 2, unitId: 2, tenantId: 2, rent: 1850 },
  { id: 3, unitId: 4, tenantId: 3, rent: 2400 }, { id: 4, unitId: 5, tenantId: 4, rent: 2100 },
  { id: 5, unitId: 6, tenantId: 5, rent: 2700 }, { id: 6, unitId: 8, tenantId: 6, rent: 4500 },
];
const unitById = Object.fromEntries(units.map((u) => [u.id, u]));

// ─── Vendors ───────────────────────────────────────────────────────────
const vendors = [
  ["Ace Plumbing Co.", "Ace Plumbing Co.", "dispatch@aceplumbing.com", "(555) 201-3344", "plumbing", "120 Industrial Way, Springfield", "84-1122334"],
  ["BrightSpark Electric", "BrightSpark Electric LLC", "service@brightspark.com", "(555) 202-7788", "electrical", "45 Volt Street, Springfield", "84-2233445"],
  ["Cool Air HVAC", "Cool Air HVAC Inc.", "info@coolairhvac.com", "(555) 203-9911", "hvac", "8 Climate Blvd, Springfield", "84-3344556"],
  ["GreenScape Landscaping", "GreenScape LLC", "hello@greenscape.com", "(555) 204-2255", "landscaping", "300 Garden Rd, Springfield", "84-4455667"],
  ["Sparkle Cleaning Services", "Sparkle Cleaning", "book@sparkleclean.com", "(555) 205-6677", "cleaning", "77 Shine Ave, Springfield", "84-5566778"],
  ["Premier Roofing", "Premier Roofing Co.", "quotes@premierroof.com", "(555) 206-4433", "roofing", "910 Summit St, Springfield", "84-6677889"],
  ["Hampton & Associates", "Hampton & Associates", "legal@hamptonlaw.com", "(555) 207-1100", "legal", "1 Justice Plaza, Springfield", "84-7788990"],
];
for (const [name, company, email, phone, category, address, taxId] of vendors) {
  await c.query(
    `INSERT INTO vendors (name, company, email, phone, category, address, taxId, status) VALUES (?,?,?,?,?,?,?, 'active')`,
    [name, company, email, phone, category, address, taxId]
  );
}
console.log("Seeded vendors");
const [vrows] = await c.query("SELECT id, category FROM vendors");
const vendorByCat = {};
for (const v of vrows) if (!vendorByCat[v.category]) vendorByCat[v.category] = v.id;

// ─── Bank Accounts ─────────────────────────────────────────────────────
const banks = [
  ["WAA Operating Account", "operating", "****4821", 184250.55, 182900.00],
  ["WAA Security Deposit Trust", "security_deposit", "****7733", 42600.00, 42600.00],
  ["WAA Reserve Fund", "reserve", "****9012", 95000.00, 95000.00],
];
for (const [name, type, mask, bank, book] of banks) {
  await c.query(
    `INSERT INTO bank_accounts (name, type, accountNumberMask, bankBalance, bookBalance, isConnected) VALUES (?,?,?,?,?, 1)`,
    [name, type, mask, bank, book]
  );
}
const [brows] = await c.query("SELECT id, type FROM bank_accounts");
const operatingBank = brows.find((b) => b.type === "operating").id;
console.log("Seeded bank accounts");

// ─── Prospects ─────────────────────────────────────────────────────────
const prospects = [
  ["Marcus Chen", "marcus.chen@email.com", "(555) 301-1001", 1, 3, "zillow", "showing"],
  ["Priya Nair", "priya.nair@email.com", "(555) 301-1002", 3, 9, "website", "application"],
  ["Tom Becker", "tom.becker@email.com", "(555) 301-1003", 2, 7, "referral", "contacted"],
  ["Sofia Reyes", "sofia.reyes@email.com", "(555) 301-1004", 1, 3, "walk_in", "new"],
  ["Dmitri Volkov", "dmitri.v@email.com", "(555) 301-1005", 3, 9, "social", "approved"],
];
for (const [name, email, phone, propertyId, unitId, leadSource, stage] of prospects) {
  await c.query(
    `INSERT INTO prospects (name, email, phone, propertyId, unitId, leadSource, stage) VALUES (?,?,?,?,?,?,?)`,
    [name, email, phone, propertyId, unitId, leadSource, stage]
  );
}
const [prows] = await c.query("SELECT id, name FROM prospects");
console.log("Seeded prospects");

// ─── Rental Applications ───────────────────────────────────────────────
const apps = [
  ["Priya Nair", "priya.nair@email.com", "(555) 301-1002", 3, 9, 11500, "screening", 720],
  ["Dmitri Volkov", "dmitri.v@email.com", "(555) 301-1005", 3, 9, 9800, "approved", 765],
  ["Marcus Chen", "marcus.chen@email.com", "(555) 301-1001", 1, 3, 6200, "pending", null],
];
for (const [name, email, phone, propertyId, unitId, income, status, score] of apps) {
  const prospect = prows.find((p) => p.name === name);
  await c.query(
    `INSERT INTO rental_applications (prospectId, applicantName, applicantEmail, applicantPhone, propertyId, unitId, monthlyIncome, desiredMoveIn, status, screeningScore) VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [prospect?.id ?? null, name, email, phone, propertyId, unitId, income, daysAhead(30), status, score]
  );
}
console.log("Seeded applications");

// ─── Tasks (incl. tenant maintenance requests) ─────────────────────────
const tasks = [
  ["tenant_request", "maintenance", "Leaking kitchen faucet", "Water pooling under the sink cabinet.", 1, 1, 1, "plumbing", "high", "in_progress", "Ace Plumbing Co.", daysAhead(2)],
  ["tenant_request", "maintenance", "AC not cooling properly", "Thermostat set to 70 but unit stays warm.", 2, 5, 4, "hvac", "urgent", "not_started", "Cool Air HVAC", daysAhead(1)],
  ["task", "general", "Quarterly landscaping - Riverside", "Trim hedges and reseed front lawn.", 1, null, null, "general", "medium", "not_started", "GreenScape Landscaping", daysAhead(7)],
  ["tenant_request", "maintenance", "Flickering hallway lights", "Lights on 2nd floor flicker intermittently.", 1, 2, 2, "electrical", "medium", "completed", "BrightSpark Electric", daysAgo(3)],
  ["task", "general", "Annual roof inspection - Oak Street", "Pre-winter roof check on all townhome units.", 2, null, null, "structural", "low", "not_started", "Premier Roofing", daysAhead(14)],
  ["owner_request", "general", "Prepare Q3 owner statement", "Compile income distribution report for owner review.", 3, null, null, "general", "high", "in_progress", "Property Manager", daysAhead(5)],
];
for (const [type, kind, title, desc, propertyId, unitId, tenantId, category, priority, status, assignee, due] of tasks) {
  const [r] = await c.query(
    `INSERT INTO tasks (type, requestKind, title, description, propertyId, unitId, tenantId, category, priority, status, assigneeName, dueDate, completedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [type, kind, title, desc, propertyId, unitId, tenantId, category, priority, status, assignee, due, status === "completed" ? new Date() : null]
  );
  const taskId = r.insertId;
  // a couple of updates
  if (status !== "not_started") {
    await c.query(`INSERT INTO task_updates (taskId, message, authorName) VALUES (?,?,?)`, [taskId, "Request received and assigned to vendor.", "Property Manager"]);
    if (status === "completed") await c.query(`INSERT INTO task_updates (taskId, message, authorName) VALUES (?,?,?)`, [taskId, "Work completed and verified. Closing ticket.", assignee]);
  }
}
const [trows] = await c.query("SELECT id, title, propertyId, unitId FROM tasks");
console.log("Seeded tasks");

// ─── Work Orders ───────────────────────────────────────────────────────
const wos = [
  ["Repair kitchen faucet & check supply line", "Replace cartridge, inspect under-sink plumbing.", false, "plumbing", 1, 1, "high", "in_progress", 185.00, null, null],
  ["Diagnose & recharge AC system", "Inspect compressor, recharge refrigerant.", false, "hvac", 2, 5, "urgent", "open", null, null, null],
  ["Monthly common-area cleaning", "Clean lobby, stairwells, and shared corridors.", true, "cleaning", 1, null, "medium", "open", 240.00, "monthly", daysAhead(5)],
  ["Quarterly HVAC filter replacement", "Replace filters across all units.", true, "hvac", 2, null, "low", "open", 320.00, "quarterly", daysAhead(20)],
  ["Replace 2nd floor hallway fixtures", "Swap out flickering LED fixtures.", false, "electrical", 1, 2, "medium", "completed", 410.00, null, null],
];
for (const [subject, desc, recurring, cat, propertyId, unitId, priority, status, bill, freq, due] of wos) {
  await c.query(
    `INSERT INTO work_orders (vendorId, propertyId, unitId, subject, workDescription, isRecurring, frequency, startDate, dueDate, priority, status, billAmount, accessToProperty) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1)`,
    [vendorByCat[cat] ?? null, propertyId, unitId, subject, desc, recurring ? 1 : 0, freq, recurring ? daysAgo(0) : null, due, priority, status, bill]
  );
}
console.log("Seeded work orders");

// ─── Transactions: charges (with CAM line items), payments, expenses ───
const expenseCats = ["maintenance", "utilities", "landscaping", "insurance", "management", "supplies"];
const expenseDescs = {
  maintenance: "Plumbing repair", utilities: "Water & sewer", landscaping: "Lawn service",
  insurance: "Property insurance premium", management: "Management fee", supplies: "Maintenance supplies",
};

// Monthly rent charges + CAM for commercial, plus payments, across last 4 months
for (let m = 3; m >= 0; m--) {
  const chargeDate = (() => { const x = new Date(today.getFullYear(), today.getMonth() - m, 1); return d(x); })();
  for (const lease of leases) {
    const unit = unitById[lease.unitId];
    const isCommercial = unit.propertyId === 3;
    // Build line items
    const lineItems = [["Rent Income", "Monthly rent", lease.rent]];
    if (isCommercial) {
      const cam = Math.round(unit.sqft * 0.45 * 100) / 100; // CAM per sqft
      const tax = Math.round(unit.sqft * 0.22 * 100) / 100;
      lineItems.push(["CAM Income", "Common area maintenance", cam]);
      lineItems.push(["Property Tax Recovery", "Property taxes", tax]);
    }
    const total = lineItems.reduce((s, li) => s + li[2], 0);
    // Charge
    const [cr] = await c.query(
      `INSERT INTO transactions (type, date, leaseId, tenantId, propertyId, unitId, category, amount, description, status) VALUES ('charge',?,?,?,?,?,?,?,?,?)`,
      [chargeDate, lease.id, lease.tenantId, unit.propertyId, unit.id, "Rent", total, isCommercial ? "Monthly rent + CAM + taxes" : "Monthly rent", m === 0 ? "pending" : "paid"]
    );
    for (const [account, desc, amt] of lineItems) {
      await c.query(`INSERT INTO transaction_line_items (transactionId, account, description, amount) VALUES (?,?,?,?)`, [cr.insertId, account, desc, amt]);
    }
    // Payment (skip current month for one lease to show outstanding)
    const skipPayment = (m === 0 && (lease.id === 3 || lease.id === 6));
    if (!skipPayment) {
      const payDate = (() => { const x = new Date(today.getFullYear(), today.getMonth() - m, m === 0 ? Math.min(today.getDate(), 5) : 3); return d(x); })();
      await c.query(
        `INSERT INTO transactions (type, date, leaseId, tenantId, propertyId, unitId, bankAccountId, category, amount, description, paymentMethod, reference, status) VALUES ('payment',?,?,?,?,?,?,?,?,?,?,?, 'received')`,
        [payDate, lease.id, lease.tenantId, unit.propertyId, unit.id, operatingBank, "Rent", total, "Rent payment", m % 2 === 0 ? "ach" : "check", `PMT-${chargeDate}-${lease.id}`]
      );
    }
  }
  // Expenses per property
  for (const prop of props) {
    const cat = expenseCats[(m + prop.id) % expenseCats.length];
    const amt = 200 + ((m + prop.id) * 137) % 900;
    const vCat = cat === "maintenance" ? "plumbing" : cat === "landscaping" ? "landscaping" : cat === "utilities" ? "hvac" : "general";
    await c.query(
      `INSERT INTO transactions (type, date, propertyId, vendorId, bankAccountId, category, amount, description, paymentMethod, status) VALUES ('expense',?,?,?,?,?,?,?,?, 'cleared')`,
      [(() => { const x = new Date(today.getFullYear(), today.getMonth() - m, 12); return d(x); })(), prop.id, vendorByCat[vCat] ?? null, operatingBank, cat, amt, expenseDescs[cat], "ach"]
    );
  }
}
console.log("Seeded transactions (charges, payments, expenses)");

// ─── Recurring Charges (rent + CAM + scheduled increase) ───────────────
for (const lease of leases) {
  const unit = unitById[lease.unitId];
  const isCommercial = unit.propertyId === 3;
  await c.query(
    `INSERT INTO recurring_charges (leaseId, account, description, amount, frequency, startDate, isIncrease) VALUES (?,?,?,?, 'monthly', ?, 0)`,
    [lease.id, "Rent Income", "Monthly rent", lease.rent, daysAgo(120)]
  );
  if (isCommercial) {
    const cam = Math.round(unit.sqft * 0.45 * 100) / 100;
    await c.query(
      `INSERT INTO recurring_charges (leaseId, account, description, amount, frequency, startDate, isIncrease) VALUES (?,?,?,?, 'monthly', ?, 0)`,
      [lease.id, "CAM Income", "Common area maintenance", cam, daysAgo(120)]
    );
    // Scheduled future rent increase
    await c.query(
      `INSERT INTO recurring_charges (leaseId, account, description, amount, frequency, startDate, effectiveDate, isIncrease) VALUES (?,?,?,?, 'monthly', ?, ?, 1)`,
      [lease.id, "Rent Income", "Scheduled annual rent increase (3%)", Math.round(lease.rent * 1.03 * 100) / 100, daysAhead(90), daysAhead(90)]
    );
  }
}
console.log("Seeded recurring charges");

// ─── Announcements ─────────────────────────────────────────────────────
const anns = [
  ["Scheduled Water Maintenance", "Water will be shut off Saturday 9am-12pm for routine maintenance at Riverside Apartments.", 1, "property"],
  ["Holiday Office Hours", "Our office will be closed Dec 24-25. Emergency maintenance line remains active.", null, "all_tenants"],
  ["Parking Lot Resealing", "The Oak Street parking lot will be resealed next Tuesday. Please move vehicles by 7am.", 2, "property"],
];
for (const [title, body, propertyId, audience] of anns) {
  await c.query(`INSERT INTO announcements (title, body, propertyId, audience) VALUES (?,?,?,?)`, [title, body, propertyId, audience]);
}
console.log("Seeded announcements");

// ─── Calendar Events ───────────────────────────────────────────────────
const events = [
  ["Move-in: Unit 3 Riverside", "move_in", daysAhead(10), 1, 3],
  ["Lease expiration: Unit 1", "lease_expiration", daysAhead(45), 1, 1],
  ["Routine inspection: Oak Street", "inspection", daysAhead(6), 2, null],
  ["Showing: Downtown Office 9", "showing", daysAhead(3), 3, 9],
  ["Move-out: Unit 7", "move_out", daysAhead(20), 2, 7],
];
for (const [title, type, date, propertyId, unitId] of events) {
  await c.query(`INSERT INTO calendar_events (title, type, date, propertyId, unitId) VALUES (?,?,?,?,?)`, [title, type, date, propertyId, unitId]);
}
console.log("Seeded calendar events");

// ─── Inspections ───────────────────────────────────────────────────────
const inspections = [
  [2, null, "routine", daysAhead(6), "scheduled", "Mike Torres"],
  [1, 3, "move_in", daysAhead(10), "scheduled", "Mike Torres"],
  [3, 8, "annual", daysAgo(20), "completed", "Mike Torres"],
];
for (const [propertyId, unitId, type, date, status, inspector] of inspections) {
  await c.query(
    `INSERT INTO inspections (propertyId, unitId, type, scheduledDate, completedDate, status, inspectorName) VALUES (?,?,?,?,?,?,?)`,
    [propertyId, unitId, type, date, status === "completed" ? date : null, status, inspector]
  );
}
console.log("Seeded inspections");

// ─── AutoPay (one tenant enabled) ──────────────────────────────────────
await c.query(
  `INSERT INTO autopay_settings (tenantId, leaseId, enabled, dayOfMonth, paymentMethod, amount) VALUES (?,?,1,1,'bank_account',?)`,
  [1, 1, "1450.00"]
);
console.log("Seeded autopay");

await c.end();
console.log("✅ v2 seed complete");
