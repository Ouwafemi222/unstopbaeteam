import { NextResponse } from "next/server";
import { getUserScope } from "@/lib/auth/scope";
import { createAdminClient } from "@/lib/supabase/admin";
import { INCENTIVE_SLOTS } from "@/lib/incentives/catalog";
import { fetchAll, loadMonthPack, type ProgressMember } from "@/lib/incentives/progress";
import type { Incentive } from "@/types/database";

export async function GET(request: Request) {
  const scope = await getUserScope();
  if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed =
    scope.roleSlugs.includes("super_admin") || scope.roleSlugs.includes("team_leader");
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const month = new URL(request.url).searchParams.get("month") ?? "";
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "Pick a month" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Incentive progress is not available right now" }, { status: 503 });
  }

  try {
    const [pack, people, incentiveRows] = await Promise.all([
      loadMonthPack(admin, month),
      fetchAll<ProgressMember>((from, to) =>
        admin
          .from("team_members")
          .select("id, full_name")
          .eq("status", "active")
          .order("full_name")
          .range(from, to)
      ),
      fetchAll<Incentive>((from, to) =>
        admin.from("incentives").select("*").not("slot", "is", null).range(from, to)
      ),
    ]);

    const prizes: Record<string, string> = {};
    for (const slot of INCENTIVE_SLOTS) {
      prizes[slot.slot] = incentiveRows.find((row) => row.slot === slot.slot)?.prize ?? "";
    }

    return NextResponse.json({ members: people, prizes, pack });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not read incentive progress" },
      { status: 500 }
    );
  }
}
