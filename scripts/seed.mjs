import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

async function seed() {
  console.log("🌱 Seeding demo data...");

  // Insert owner
  await connection.execute(`
    INSERT IGNORE INTO owners (id, name, email, phone, company, city, state, notes)
    VALUES 
      (1, 'Sarah Mitchell', 'sarah@mitchellproperties.com', '(512) 555-0101', 'Mitchell Properties LLC', 'Austin', 'TX', 'Primary portfolio owner'),
      (2, 'James Hartwell', 'james@hartwellinvest.com', '(512) 555-0202', 'Hartwell Investments', 'Austin', 'TX', 'Commercial property investor')
  `);

  // Insert properties
  await connection.execute(`
    INSERT IGNORE INTO properties (id, ownerId, name, address, city, state, zip, type, description, totalUnits)
    VALUES 
      (1, 1, 'Riverside Apartments', '1420 Riverside Dr', 'Austin', 'TX', '78701', 'residential', 'Modern apartment complex near the river', 4),
      (2, 1, 'Oak Street Townhomes', '845 Oak Street', 'Austin', 'TX', '78702', 'residential', 'Charming townhomes in East Austin', 3),
      (3, 2, 'Downtown Office Suite', '200 Congress Ave', 'Austin', 'TX', '78701', 'commercial', 'Premium office space in downtown Austin', 2)
  `);

  // Insert units
  await connection.execute(`
    INSERT IGNORE INTO units (id, propertyId, unitNumber, type, bedrooms, bathrooms, sqft, floor, rentAmount, depositAmount, status)
    VALUES 
      (1, 1, '101', '1br', 1, '1.0', 750, 1, '1450.00', '1450.00', 'occupied'),
      (2, 1, '102', '2br', 2, '2.0', 1050, 1, '1850.00', '1850.00', 'occupied'),
      (3, 1, '201', '2br', 2, '2.0', 1100, 2, '1950.00', '1950.00', 'vacant'),
      (4, 1, '202', '3br', 3, '2.0', 1400, 2, '2400.00', '2400.00', 'occupied'),
      (5, 2, 'A', '2br', 2, '1.5', 1200, 1, '2100.00', '2100.00', 'occupied'),
      (6, 2, 'B', '3br', 3, '2.5', 1600, 1, '2700.00', '2700.00', 'occupied'),
      (7, 2, 'C', '2br', 2, '1.5', 1200, 1, '2100.00', '2100.00', 'maintenance'),
      (8, 3, 'Suite 100', 'commercial', 0, '2.0', 2000, 1, '4500.00', '9000.00', 'occupied'),
      (9, 3, 'Suite 200', 'commercial', 0, '1.0', 1200, 2, '2800.00', '5600.00', 'vacant')
  `);

  // Insert tenants
  await connection.execute(`
    INSERT IGNORE INTO tenants (id, name, email, phone, emergencyContactName, emergencyContactPhone, idType, status, notes)
    VALUES 
      (1, 'Alex Johnson', 'alex.johnson@email.com', '(512) 555-1001', 'Mary Johnson', '(512) 555-1002', 'drivers_license', 'active', 'Long-term tenant, excellent payment history'),
      (2, 'Maria Garcia', 'maria.garcia@email.com', '(512) 555-2001', 'Carlos Garcia', '(512) 555-2002', 'passport', 'active', 'Works remotely, very quiet'),
      (3, 'David Chen', 'david.chen@email.com', '(512) 555-3001', 'Linda Chen', '(512) 555-3002', 'drivers_license', 'active', 'Software engineer at local tech company'),
      (4, 'Emma Williams', 'emma.williams@email.com', '(512) 555-4001', 'Robert Williams', '(512) 555-4002', 'state_id', 'active', 'Graduate student at UT Austin'),
      (5, 'Michael Brown', 'michael.brown@email.com', '(512) 555-5001', 'Susan Brown', '(512) 555-5002', 'drivers_license', 'active', 'Restaurant manager, night schedule'),
      (6, 'TechCorp Inc', 'office@techcorp.com', '(512) 555-6001', 'John Smith', '(512) 555-6002', 'ein', 'active', 'Corporate tenant, Suite 100')
  `);

  // Insert leases
  await connection.execute(`
    INSERT IGNORE INTO leases (id, unitId, tenantId, startDate, endDate, rentAmount, depositAmount, depositPaid, paymentDueDay, lateFeeAmount, lateFeeGraceDays, status)
    VALUES 
      (1, 1, 1, '2023-01-15', '2025-01-14', '1450.00', '1450.00', 1, 1, '75.00', 5, 'active'),
      (2, 2, 2, '2023-06-01', '2025-05-31', '1850.00', '1850.00', 1, 1, '75.00', 5, 'active'),
      (3, 4, 3, '2022-09-01', '2024-08-31', '2400.00', '2400.00', 1, 1, '100.00', 5, 'active'),
      (4, 5, 4, '2024-02-01', '2026-01-31', '2100.00', '2100.00', 1, 1, '100.00', 5, 'active'),
      (5, 6, 5, '2023-03-15', '2025-03-14', '2700.00', '2700.00', 1, 1, '125.00', 5, 'active'),
      (6, 8, 6, '2022-01-01', '2025-12-31', '4500.00', '9000.00', 1, 1, '225.00', 5, 'active')
  `);

  // Insert rent payments (last 3 months)
  const months = [
    { due: '2026-04-01', paid: '2026-04-01', month: 'April' },
    { due: '2026-05-01', paid: '2026-05-03', month: 'May' },
    { due: '2026-06-01', paid: null, month: 'June' },
  ];

  let paymentId = 1;
  for (const m of months) {
    const leases = [
      { id: 1, tenantId: 1, amount: '1450.00' },
      { id: 2, tenantId: 2, amount: '1850.00' },
      { id: 3, tenantId: 3, amount: '2400.00' },
      { id: 4, tenantId: 4, amount: '2100.00' },
      { id: 5, tenantId: 5, amount: '2700.00' },
      { id: 6, tenantId: 6, amount: '4500.00' },
    ];
    for (const l of leases) {
      const isPaid = m.paid !== null;
      const status = isPaid ? 'paid' : (m.due < '2026-06-24' ? 'overdue' : 'pending');
      await connection.execute(`
        INSERT IGNORE INTO rent_payments (id, leaseId, tenantId, amount, totalAmount, dueDate, paidDate, paymentMethod, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [paymentId++, l.id, l.tenantId, l.amount, l.amount, m.due, m.paid, isPaid ? 'ach' : null, status]);
    }
  }

  // Insert expenses
  await connection.execute(`
    INSERT IGNORE INTO expenses (id, propertyId, description, amount, category, date, vendor)
    VALUES 
      (1, 1, 'Property Insurance Premium', '3200.00', 'insurance', '2026-01-15', 'State Farm'),
      (2, 1, 'Plumbing Repair - Unit 102', '450.00', 'maintenance', '2026-02-08', 'Austin Plumbing Co'),
      (3, 1, 'Landscaping Service', '280.00', 'landscaping', '2026-03-01', 'Green Thumb LLC'),
      (4, 2, 'HVAC Maintenance', '380.00', 'maintenance', '2026-02-20', 'Cool Air Services'),
      (5, 2, 'Property Tax Q1', '2100.00', 'taxes', '2026-03-31', 'Travis County'),
      (6, 3, 'Elevator Maintenance', '650.00', 'maintenance', '2026-04-10', 'Otis Elevator'),
      (7, 1, 'Pest Control', '180.00', 'other', '2026-05-15', 'Bug Busters'),
      (8, 2, 'Exterior Painting', '2800.00', 'maintenance', '2026-05-20', 'Pro Painters'),
      (9, 1, 'Common Area Cleaning', '320.00', 'other', '2026-06-01', 'Sparkle Clean'),
      (10, 3, 'Security System Upgrade', '1200.00', 'maintenance', '2026-06-10', 'SecureGuard')
  `);

  // Insert maintenance requests
  await connection.execute(`
    INSERT IGNORE INTO maintenance_requests (id, unitId, tenantId, title, description, category, priority, status, assignedTo, estimatedCost)
    VALUES 
      (1, 1, 1, 'Leaking faucet in kitchen', 'The kitchen faucet has been dripping constantly for 3 days', 'plumbing', 'medium', 'open', 'Austin Plumbing Co', '150.00'),
      (2, 2, 2, 'AC not cooling properly', 'Air conditioning unit is running but not cooling below 78 degrees', 'hvac', 'high', 'in_progress', 'Cool Air Services', '350.00'),
      (3, 4, 3, 'Broken window latch', 'Bedroom window latch is broken and cannot lock', 'structural', 'medium', 'open', NULL, '80.00'),
      (4, 5, 4, 'Dishwasher not draining', 'Dishwasher fills with water but does not drain after cycle', 'appliance', 'medium', 'resolved', 'Appliance Pro', '220.00'),
      (5, 6, 5, 'Parking lot light out', 'Exterior parking lot light 3 has been out for a week', 'electrical', 'low', 'open', NULL, '120.00'),
      (6, 7, NULL, 'Water damage in bathroom', 'Significant water damage found during inspection, needs full repair', 'plumbing', 'urgent', 'in_progress', 'Austin Plumbing Co', '2500.00')
  `);

  console.log("✅ Demo data seeded successfully!");
  await connection.end();
}

seed().catch(console.error);
