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

export type OcrCallMode = "sheet" | "goals";

export interface CallOcrSpaceOptions {
  /** sheet = table import; goals = handwritten goals (lighter OCR settings) */
  mode?: OcrCallMode;
}

function getOcrSpaceApiKey(): string {
  const key = process.env.OCR_SPACE_API_KEY;
  if (!key || key === "your_ocr_space_api_key_here") {
    throw new Error(
      "OCR is not configured. Ask admin to add OCR_SPACE_API_KEY in Vercel environment variables."
    );
  }
  return key;
}

/** Free OCR.space plan: 1 MB max per image */
export const MAX_OCR_FILE_BYTES = 1024 * 1024;
export const ACCEPTED_OCR_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

const OCR_URL = "https://api.ocr.space/parse/image";
const RETRYABLE_STATUSES = new Set([502, 503, 504, 429]);

function mimeToFileType(mime: string): string {
  if (mime.includes("png")) return "PNG";
  if (mime.includes("webp")) return "PNG";
  return "JPG";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildFormData(
  apiKey: string,
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  engine: string,
  mode: OcrCallMode
): FormData {
  const formData = new FormData();
  formData.append("apikey", apiKey);
  formData.append(
    "file",
    new Blob([new Uint8Array(fileBuffer)], { type: mimeType }),
    fileName || "sheet.jpg"
  );
  formData.append("language", "eng");
  formData.append("OCREngine", engine);
  formData.append("scale", "true");
  formData.append("detectOrientation", "true");
  formData.append("filetype", mimeToFileType(mimeType));
  if (mode === "sheet") {
    formData.append("isTable", "true");
  }
  return formData;
}

function buildBase64FormData(
  apiKey: string,
  fileBuffer: Buffer,
  mimeType: string,
  engine: string,
  mode: OcrCallMode
): FormData {
  const formData = new FormData();
  formData.append("apikey", apiKey);
  formData.append(
    "base64Image",
    `data:${mimeType};base64,${fileBuffer.toString("base64")}`
  );
  formData.append("language", "eng");
  formData.append("OCREngine", engine);
  formData.append("scale", "true");
  formData.append("detectOrientation", "true");
  formData.append("filetype", mimeToFileType(mimeType));
  if (mode === "sheet") {
    formData.append("isTable", "true");
  }
  return formData;
}

function parseOcrResponse(payload: OcrSpaceResponse): string {
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
    throw new Error(pageError ?? "No text detected in the image. Try a clearer photo.");
  }

  return parts.join("\n\n");
}

async function postToOcrSpace(formData: FormData): Promise<string> {
  const response = await fetch(OCR_URL, {
    method: "POST",
    body: formData,
    signal: AbortSignal.timeout(45_000),
  });

  if (!response.ok) {
    const err = new Error(`OCR_SPACE_HTTP_${response.status}`) as Error & { status: number };
    err.status = response.status;
    throw err;
  }

  const payload = (await response.json()) as OcrSpaceResponse;
  return parseOcrResponse(payload);
}

function friendlyHttpError(status: number): string {
  if (status === 502 || status === 503 || status === 504) {
    return "OCR.space is temporarily unavailable (server busy). Wait a minute and try again, or enter goals manually.";
  }
  if (status === 429) {
    return "OCR rate limit reached. Wait an hour or enter goals manually.";
  }
  return `OCR service error (${status}). Try again or enter goals manually.`;
}

/**
 * Call OCR.space with retries, engine fallback, and base64 fallback for 502s.
 */
export async function callOcrSpace(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  options: CallOcrSpaceOptions = {}
): Promise<string> {
  const apiKey = getOcrSpaceApiKey();
  const mode = options.mode ?? "sheet";
  const preferredEngine = process.env.OCR_SPACE_ENGINE ?? (mode === "goals" ? "3" : "3");
  const engines = preferredEngine === "3" ? ["3", "2"] : [preferredEngine];

  let lastError: unknown;

  for (const engine of engines) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const formData = buildFormData(apiKey, fileBuffer, fileName, mimeType, engine, mode);
        return await postToOcrSpace(formData);
      } catch (err) {
        lastError = err;
        const status = (err as { status?: number }).status;
        if (status && RETRYABLE_STATUSES.has(status) && attempt === 0) {
          await sleep(1500);
          continue;
        }
        break;
      }
    }

    // Base64 upload fallback (sometimes works when multipart gets 502)
    try {
      const base64Form = buildBase64FormData(apiKey, fileBuffer, mimeType, engine, mode);
      return await postToOcrSpace(base64Form);
    } catch (err) {
      lastError = err;
    }
  }

  const status = (lastError as { status?: number })?.status;
  if (status) {
    throw new Error(friendlyHttpError(status));
  }
  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new Error("OCR extraction failed. Try again or enter goals manually.");
}

export async function extractSheetFromImage(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  sheetType: OcrSheetType
): Promise<OcrExtractResponse> {
  const rawText = await callOcrSpace(fileBuffer, fileName, mimeType, { mode: "sheet" });
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
