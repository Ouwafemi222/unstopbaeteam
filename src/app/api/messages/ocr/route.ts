import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  ACCEPTED_OCR_TYPES,
  MAX_OCR_FILE_BYTES,
  callOcrSpace,
} from "@/lib/forecast/ocr-extract";
import { parseMessageOcr } from "@/lib/messages/ocr-parse";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Add the message screenshot" }, { status: 400 });
  }

  if (!ACCEPTED_OCR_TYPES.includes(file.type) && file.type !== "image/jpg") {
    return NextResponse.json({ error: "Use a PNG, JPG, or WEBP screenshot" }, { status: 400 });
  }

  if (file.size > MAX_OCR_FILE_BYTES) {
    return NextResponse.json({ error: "Use an image under 5 MB" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const rawText = await callOcrSpace(buffer, file.name || "message.jpg", file.type || "image/jpeg", {
      mode: "goals",
    });
    return NextResponse.json({ readout: parseMessageOcr(rawText) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not read the screenshot";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
