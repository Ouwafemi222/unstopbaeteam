import type { OcrExtractResponse, OcrSheetType } from "@/lib/forecast/ocr-types";
import type { ForecastAccountRow } from "@/data/forecast-accounts";
import type { ForecastMessageRow } from "@/data/forecast-messages";
import { parseSheetText } from "@/lib/forecast/ocr-parse";

interface OcrSpaceParsedResult {
  ParsedText?: string;
  ErrorMessage?: string;
}

interface OcrSpaceResponse {
  ParsedResults?: OcrSpaceParsedResult[];
  IsErroredOnProcessing?: boolean;
  ErrorMessage?: string | string[];
  ErrorDetails?: string;
  OCRExitCode?: number;
}

function getOcrSpaceApiKey(): string {
  const key = process.env.OCR_SPACE_API_KEY;
  if (!key || key === "your_ocr_space_api_key_here") {
    throw new Error(
      "OCR is not configured. Add OCR_SPACE_API_KEY to Vercel → Settings → Environment Variables (and .env.local locally)."
    );
  }
  return key;
}

/** Free OCR.space plan: 1 MB max per image */
export const MAX_OCR_FILE_BYTES = 1024 * 1024;
export const ACCEPTED_OCR_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

function mimeToFileType(mime: string): string {
  if (mime.includes("png")) return "PNG";
  if (mime.includes("webp")) return "PNG";
  return "JPG";
}

export async function callOcrSpace(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  const apiKey = getOcrSpaceApiKey();
  const engine = process.env.OCR_SPACE_ENGINE ?? "3";

  const formData = new FormData();
  formData.append("apikey", apiKey);
  formData.append(
    "file",
    new Blob([new Uint8Array(fileBuffer)], { type: mimeType }),
    fileName || "sheet.jpg"
  );
  formData.append("language", "eng");
  formData.append("OCREngine", engine);
  formData.append("isTable", "true");
  formData.append("scale", "true");
  formData.append("detectOrientation", "true");
  formData.append("filetype", mimeToFileType(mimeType));

  const response = await fetch("https://api.ocr.space/parse/image", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`OCR.space request failed (${response.status})`);
  }

  const payload = (await response.json()) as OcrSpaceResponse;

  if (payload.IsErroredOnProcessing) {
    const msg = Array.isArray(payload.ErrorMessage)
      ? payload.ErrorMessage.join("; ")
      : payload.ErrorMessage ?? payload.ErrorDetails ?? "OCR processing failed";
    throw new Error(msg);
  }

  const parts =
    payload.ParsedResults?.map((r) => r.ParsedText?.trim()).filter(Boolean) ?? [];

  if (parts.length === 0) {
    const pageError = payload.ParsedResults?.[0]?.ErrorMessage;
    throw new Error(pageError ?? "No text detected in the image");
  }

  return parts.join("\n\n");
}

export async function extractSheetFromImage(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  sheetType: OcrSheetType
): Promise<OcrExtractResponse> {
  const rawText = await callOcrSpace(fileBuffer, fileName, mimeType);
  const { rows, notes, rawText: preview } = parseSheetText(rawText, sheetType);

  return {
    sheetType,
    rows: rows as ForecastAccountRow[] | ForecastMessageRow[],
    rawNotes: notes,
    rawText: preview,
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
