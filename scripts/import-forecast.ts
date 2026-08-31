/**
 * One-off script: wipe mock data and import forecast accounts.
 * Run: npx tsx scripts/import-forecast.ts
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  const { createAdminClient } = await import("../src/lib/supabase/admin");
  const { importForecastData } = await import("../src/lib/forecast/import");
  const db = createAdminClient();
  if (!db) {
    throw new Error("Set SUPABASE_SERVICE_ROLE_KEY in .env.local for CLI import");
  }
  const result = await importForecastData(db, { clearDemo: true });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
