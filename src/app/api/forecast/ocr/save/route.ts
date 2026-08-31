import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  importAccountRows,
  importMessageRows,
  resolveImportClient,
  type ForecastImportResult,
  type ForecastMessageImportResult,
} from "@/lib/forecast/import";
import type { ForecastAccountRow } from "@/data/forecast-accounts";
import type { ForecastMessageRow } from "@/data/forecast-messages";
import type { OcrSheetType } from "@/lib/forecast/ocr-types";
import { logActivity } from "@/lib/services/activity";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: isAdmin } = await supabase.rpc("is_super_admin");
  if (!isAdmin) return NextResponse.json({ error: "Super Admin only" }, { status: 403 });

  const body = await request.json();
  const sheetType = body.sheetType as OcrSheetType;
  const rows = body.rows as ForecastAccountRow[] | ForecastMessageRow[];

  if (!rows?.length) {
    return NextResponse.json({ error: "No rows to import" }, { status: 400 });
  }

  try {
    const db = await resolveImportClient(supabase);
    const memberIds = new Map<string, string>();

    if (sheetType === "accounts") {
      const result: ForecastImportResult = {
        membersCreated: 0,
        membersExisting: 0,
        accountsCreated: 0,
        accountsSkipped: 0,
        errors: [],
      };
      const { data: countries } = await db.from("countries").select("id, code");
      const countryMap = new Map(countries?.map((c) => [c.code, c.id]) ?? []);
      await importAccountRows(db, rows as ForecastAccountRow[], result, memberIds, countryMap);

      await logActivity({
        action: "import",
        entityType: "ocr_accounts",
        entityLabel: `OCR account import: ${result.accountsCreated} accounts`,
        newValue: result as unknown as Record<string, unknown>,
      });

      return NextResponse.json({ success: true, sheetType, ...result });
    }

    if (sheetType === "messages") {
      const result: ForecastMessageImportResult = {
        membersCreated: 0,
        membersExisting: 0,
        messagesCreated: 0,
        messagesSkipped: 0,
        errors: [],
      };
      await importMessageRows(db, rows as ForecastMessageRow[], result, memberIds, {
        skipDuplicates: true,
      });

      await logActivity({
        action: "import",
        entityType: "ocr_messages",
        entityLabel: `OCR message import: ${result.messagesCreated} messages`,
        newValue: result as unknown as Record<string, unknown>,
      });

      return NextResponse.json({ success: true, sheetType, ...result });
    }

    return NextResponse.json({ error: "Invalid sheetType" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
