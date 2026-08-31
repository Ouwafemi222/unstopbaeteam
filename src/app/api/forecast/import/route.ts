import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { importForecastData, resolveImportClient } from "@/lib/forecast/import";
import { logActivity } from "@/lib/services/activity";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: isAdmin } = await supabase.rpc("is_super_admin");
  if (!isAdmin) return NextResponse.json({ error: "Super Admin only" }, { status: 403 });

  try {
    const db = await resolveImportClient(supabase);
    const result = await importForecastData(db, { clearDemo: true });

    await logActivity({
      action: "import",
      entityType: "forecast",
      entityLabel: `Forecast import: ${result.accountsCreated} accounts, ${result.membersCreated} new members`,
      newValue: result as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
