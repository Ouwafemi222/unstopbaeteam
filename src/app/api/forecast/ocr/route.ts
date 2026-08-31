import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractSheetFromImage, MAX_OCR_FILE_BYTES, ACCEPTED_OCR_TYPES } from "@/lib/forecast/ocr-extract";
import type { OcrSheetType } from "@/lib/forecast/ocr-types";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: isAdmin } = await supabase.rpc("is_super_admin");
  if (!isAdmin) return NextResponse.json({ error: "Super Admin only" }, { status: 403 });

  const formData = await request.formData();
  const file = formData.get("file");
  const sheetType = formData.get("sheetType") as OcrSheetType;

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Please upload an image file" }, { status: 400 });
  }

  if (sheetType !== "accounts" && sheetType !== "messages") {
    return NextResponse.json({ error: "sheetType must be accounts or messages" }, { status: 400 });
  }

  if (!ACCEPTED_OCR_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Use PNG, JPG, or WEBP images" }, { status: 400 });
  }

  if (file.size > MAX_OCR_FILE_BYTES) {
    return NextResponse.json({ error: "Image must be under 10MB" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const result = await extractSheetFromImage(base64, file.type, sheetType);

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "OCR extraction failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
