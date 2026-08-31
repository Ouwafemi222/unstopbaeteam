import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const type = searchParams.get("type") ?? "monthly_messages";
  const month = searchParams.get("month") ?? String(new Date().getMonth() + 1);
  const year = searchParams.get("year") ?? String(new Date().getFullYear());

  const supabase = await createClient();
  const monthStart = `${year}-${month.padStart(2, "0")}-01`;
  const nextMonth = parseInt(month) === 12
    ? `${parseInt(year) + 1}-01-01`
    : `${year}-${String(parseInt(month) + 1).padStart(2, "0")}-01`;

  let csv = "";
  let filename = `report-${type}-${year}-${month}.csv`;

  if (type === "monthly_messages" || type === "zero_message") {
    const { data: members } = await supabase.from("team_members").select("*").eq("status", "active");
    const { data: messages } = await supabase.from("messages").select("team_member_id, received_date");

    csv = "Member,Messages This Month,Status\n";
    members?.forEach((m) => {
      const count = messages?.filter((msg) =>
        msg.team_member_id === m.id && msg.received_date >= monthStart && msg.received_date < nextMonth
      ).length ?? 0;
      if (type === "zero_message" && count > 0) return;
      csv += `"${m.full_name}",${count},${count === 0 ? "No Messages" : "Active"}\n`;
    });
  } else if (type === "account") {
    const { data: accounts } = await supabase
      .from("fiverr_accounts")
      .select("*, team_member:team_members(full_name), country:countries(name)")
      .is("archived_at", null);

    csv = "Member,Username,Email,Country,Status,Opening Date\n";
    accounts?.forEach((a) => {
      csv += `"${(a.team_member as { full_name: string })?.full_name}","${a.username}","${a.email ?? ""}","${(a.country as { name: string })?.name ?? ""}","${a.status}","${a.opening_date ?? ""}"\n`;
    });
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
