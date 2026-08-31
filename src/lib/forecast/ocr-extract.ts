import { z } from "zod";
import type { OcrExtractResponse, OcrSheetType } from "@/lib/forecast/ocr-types";
import type { ForecastAccountRow } from "@/data/forecast-accounts";
import type { ForecastMessageRow } from "@/data/forecast-messages";

const accountRowSchema = z.object({
  member: z.string().min(1),
  email: z.string().refine((s) => s.includes("@"), "Invalid email"),
  phone: z.string().min(1),
  country: z.enum(["GB", "US", "NG", "DE"]),
  opening_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const messageRowSchema = z.object({
  member: z.string().min(1),
  received_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  service: z.string().min(1),
  count: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

const accountsResponseSchema = z.object({
  rows: z.array(accountRowSchema),
  notes: z.string().optional(),
});

const messagesResponseSchema = z.object({
  rows: z.array(messageRowSchema),
  notes: z.string().optional(),
});

function buildPrompt(sheetType: OcrSheetType): string {
  if (sheetType === "accounts") {
    return `You are reading a handwritten UNSTOPPABLE TEAM sheet of Fiverr ACCOUNTS (not messages).

Extract every account row you can read. Return ONLY valid JSON in this exact shape:
{
  "rows": [
    {
      "member": "Mr Femi",
      "email": "example@gmail.com",
      "phone": "447351404214",
      "country": "GB",
      "opening_date": "2026-05-08"
    }
  ],
  "notes": "optional summary of unclear cells"
}

Rules:
- member must be the team member name with title: "Mr ..." or "Miss ..."
- country must be one of: GB, US, NG, DE (infer from phone/context if needed)
- opening_date must be ISO format YYYY-MM-DD (infer year 2026 if only day/month visible)
- email must look like a real email; skip rows you cannot read confidently
- phone: digits only, keep country codes if present
- Do not invent rows that are not visible in the image`;
  }

  return `You are reading a handwritten UNSTOPPABLE TEAM message log (gig inquiries by team member).

Extract every message row. Return ONLY valid JSON:
{
  "rows": [
    {
      "member": "Mr Femi",
      "received_date": "2026-06-10",
      "service": "ComfyUI",
      "count": 1,
      "notes": ""
    }
  ],
  "notes": "optional summary"
}

Rules:
- member: "Mr ..." or "Miss ..." team member who received the message
- received_date: ISO YYYY-MM-DD (use 2026 if year not shown)
- service: gig/service name written on the sheet
- count: number if a tally is shown, otherwise 1
- Skip rows you cannot read confidently`;
}

export async function extractSheetFromImage(
  imageBase64: string,
  mimeType: string,
  sheetType: OcrSheetType
): Promise<OcrExtractResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === "your_openai_api_key_here") {
    throw new Error(
      "OCR is not configured. Add OPENAI_API_KEY to your environment variables (Vercel → Settings → Environment Variables)."
    );
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL ?? "gpt-4o",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: buildPrompt(sheetType) },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
                detail: "high",
              },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const message =
      (err as { error?: { message?: string } })?.error?.message ??
      `Vision API failed (${response.status})`;
    throw new Error(message);
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("No extraction result from vision model");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Could not parse extraction result as JSON");
  }

  if (sheetType === "accounts") {
    const data = accountsResponseSchema.parse(parsed);
    return {
      sheetType,
      rows: data.rows as ForecastAccountRow[],
      rawNotes: data.notes,
    };
  }

  const data = messagesResponseSchema.parse(parsed);
  return {
    sheetType,
    rows: data.rows as ForecastMessageRow[],
    rawNotes: data.notes,
  };
}

export function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const [, base64] = result.split(",");
      resolve({ base64, mimeType: file.type || "image/jpeg" });
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export const MAX_OCR_FILE_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_OCR_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
