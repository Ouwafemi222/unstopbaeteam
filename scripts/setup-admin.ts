/**
 * Setup script to create the Super Admin user.
 * 
 * Usage:
 *   1. Add your SUPABASE_SERVICE_ROLE_KEY to .env.local
 *   2. Run: npx tsx scripts/setup-admin.ts
 * 
 * Or create the user manually in Supabase Dashboard:
 *   Authentication > Users > Add User
 *   Then run the SQL below in SQL Editor to assign super_admin role.
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@unstoppable.team";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Unstoppable2026!";
const ADMIN_NAME = process.env.ADMIN_NAME || "Super Admin";

async function main() {
  if (!SERVICE_ROLE_KEY || SERVICE_ROLE_KEY === "your_service_role_key_here") {
    console.error("Please set SUPABASE_SERVICE_ROLE_KEY in .env.local");
    console.log("\nAlternatively, create user in Supabase Dashboard and run this SQL:");
    console.log(`
-- After creating user in Supabase Auth, assign super_admin role:
INSERT INTO user_roles (user_id, role_id)
SELECT '<USER_UUID>', id FROM roles WHERE slug = 'super_admin';
    `);
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: ADMIN_NAME },
  });

  if (authError) {
    if (authError.message.includes("already been registered")) {
      console.log("User already exists, fetching...");
      const { data: users } = await supabase.auth.admin.listUsers();
      const existing = users.users.find((u) => u.email === ADMIN_EMAIL);
      if (!existing) { console.error("Could not find existing user"); process.exit(1); }
      await assignRole(supabase, existing.id);
      return;
    }
    console.error("Auth error:", authError.message);
    process.exit(1);
  }

  console.log("Created user:", authData.user.email);
  await assignRole(supabase, authData.user.id);
}

async function assignRole(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data: role } = await supabase.from("roles").select("id").eq("slug", "super_admin").single();
  if (!role) { console.error("super_admin role not found"); process.exit(1); }

  const { error } = await supabase.from("user_roles").upsert({
    user_id: userId,
    role_id: role.id,
  });

  if (error) console.error("Role assignment error:", error.message);
  else console.log("Assigned super_admin role successfully");
  console.log(`\nLogin credentials:\n  Email: ${ADMIN_EMAIL}\n  Password: ${ADMIN_PASSWORD}`);
}

main();
