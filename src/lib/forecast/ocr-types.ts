import type { ForecastAccountRow } from "@/data/forecast-accounts";
import type { ForecastMessageRow } from "@/data/forecast-messages";

export type OcrSheetType = "accounts" | "messages";

export interface OcrExtractResponse {
  sheetType: OcrSheetType;
  rows: ForecastAccountRow[] | ForecastMessageRow[];
  rawNotes?: string;
  rawText?: string;
}

export interface OcrSaveResult {
  sheetType: OcrSheetType;
  membersCreated: number;
  membersExisting: number;
  accountsCreated?: number;
  accountsSkipped?: number;
  messagesCreated?: number;
  messagesSkipped?: number;
  errors: string[];
}
