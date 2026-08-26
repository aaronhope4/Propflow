/**
 * seed-admin.mjs — Create a test admin account for WAA PropFlow
 * Run: node scripts/seed-admin.mjs
 */
import { createConnection } from "mysql2/promise";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required.");
  process.exit(1);
}

const ADMIN_EMAIL = "admin@waa-propflow.com";
const ADMIN_PASSWORD = "Admin1234!";
const ADMIN_NAME = "WAA Admin";

async function main() {
  const conn = await createConnection(DATABASE_URL);
  console.log("Connected to database.");

  try {
    // Check if admin already exists
    const [existing] = await conn.execute(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [ADMIN_EMAIL]
    );

    if (existing.length > 0) {
      console.log(`Admin account already exists: ${ADMIN_EMAIL}`);
      console.log("Updating password hash...");
      const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
      await conn.execute(
        "UPDATE users SET passwordHash = ?, loginMethod = 'email', role = 'admin' WHERE email = ?",
        [hash, ADMIN_EMAIL]
      );
      console.log("Password updated.");
    } else {
      const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
      const openId = `email_${nanoid(24)}`;
      await conn.execute(
        `INSERT INTO users (openId, name, email, loginMethod, role, passwordHash, lastSignedIn)
         VALUES (?, ?, ?, 'email', 'admin', ?, NOW())`,
        [openId, ADMIN_NAME, ADMIN_EMAIL, hash]
      );
      console.log(`Admin account created: ${ADMIN_EMAIL}`);
    }

    console.log("\n=== Test Credentials ===");
    console.log(`Email:    ${ADMIN_EMAIL}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
    console.log("========================\n");
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
