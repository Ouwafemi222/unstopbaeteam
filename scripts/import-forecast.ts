/**
 * One-off script: wipe mock data and import forecast accounts.
 * Run: npx tsx scripts/import-forecast.ts
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

async function main() {
  const { importForecastData } = await import("../src/lib/forecast/import");
  const result = await importForecastData({ clearDemo: true });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
