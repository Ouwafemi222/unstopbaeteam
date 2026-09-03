import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  ACCEPTED_OCR_TYPES,
  MAX_OCR_FILE_BYTES,
  callOcrSpace,
} from "@/lib/forecast/ocr-extract";
import { parseAccountFromOcrText } from "@/lib/forecast/account-ocr-parse";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Available to any logged-in user (members filling their own form, admins/finance managers too)

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Please upload an image" }, { status: 400 });
  }

  if (!ACCEPTED_OCR_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Use PNG, JPG, or WEBP images" }, { status: 400 });
  }

  if (file.size > MAX_OCR_FILE_BYTES) {
    return NextResponse.json(
      { error: "Image must be under 1MB. Compress or crop the photo." },
      { status: 400 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const rawText = await callOcrSpace(buffer, file.name, file.type, { mode: "goals" });
    const parsed = parseAccountFromOcrText(rawText);

    return NextResponse.json({ rawText, parsed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "OCR extraction failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
