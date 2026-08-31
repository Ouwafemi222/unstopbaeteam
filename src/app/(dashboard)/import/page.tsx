"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Upload,
  Image,
  FileSearch,
  CheckCircle,
  AlertCircle,
  CloudUpload,
  Users,
  Copy,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FORECAST_ACCOUNTS } from "@/data/forecast-accounts";
import { FORECAST_MESSAGES } from "@/data/forecast-messages";
import { normalizeMemberName } from "@/data/forecast-members";
import { toast } from "sonner";
import { MessageSquare } from "lucide-react";

const steps = [
  { id: 1, label: "Upload Screenshot", icon: Upload, status: "pending" },
  { id: 2, label: "Preview Screenshot", icon: Image, status: "pending" },
  { id: 3, label: "Extract Fields", icon: FileSearch, status: "pending" },
  { id: 4, label: "Review & Correct", icon: CheckCircle, status: "pending" },
  { id: 5, label: "Save Record", icon: CheckCircle, status: "pending" },
];

const memberSummary = [...FORECAST_ACCOUNTS.reduce((map, row) => {
  map.set(row.member, (map.get(row.member) ?? 0) + 1);
  return map;
}, new Map<string, number>())].sort((a, b) => a[0].localeCompare(b[0]));

const messageMemberSummary = [...FORECAST_MESSAGES.reduce((map, row) => {
  const name = normalizeMemberName(row.member);
  map.set(name, (map.get(name) ?? 0) + (row.count ?? 1));
  return map;
}, new Map<string, number>())].sort((a, b) => a[0].localeCompare(b[0]));

const messageTotal = FORECAST_MESSAGES.reduce((sum, r) => sum + (r.count ?? 1), 0);

interface ImportResult {
  membersCreated: number;
  membersExisting: number;
  accountsCreated: number;
  accountsSkipped: number;
  errors: string[];
}

interface MessageImportResult {
  membersCreated: number;
  membersExisting: number;
  messagesCreated: number;
  messagesSkipped: number;
  errors: string[];
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importingMessages, setImportingMessages] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [messageResult, setMessageResult] = useState<MessageImportResult | null>(null);
  const joinUrl = typeof window !== "undefined" ? `${window.location.origin}/join` : "/join";

  async function handleForecastImport() {
    if (!confirm("Import all forecast accounts? This removes all existing mock accounts, messages, and unlinked team members.")) return;
    setImporting(true);
    setResult(null);

    const res = await fetch("/api/forecast/import", { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
      toast.error(data.error ?? "Import failed");
      setImporting(false);
      return;
    }

    setResult(data);
    toast.success(`Imported ${data.accountsCreated} accounts for ${memberSummary.length} team members`);
    setImporting(false);
  }

  async function handleMessageImport() {
    if (!confirm("Import all forecast messages? This replaces existing messages in the database.")) return;
    setImportingMessages(true);
    setMessageResult(null);

    const res = await fetch("/api/forecast/import-messages", { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
      toast.error(data.error ?? "Message import failed");
      setImportingMessages(false);
      return;
    }

    setMessageResult(data);
    toast.success(`Imported ${data.messagesCreated} messages`);
    setImportingMessages(false);
  }

  function copyJoinLink() {
    navigator.clipboard.writeText(joinUrl);
    toast.success("Registration link copied");
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Import Accounts</h1>
        <p className="text-neutral-500 mt-1">Upload forecast data and send registration links to your team</p>
      </div>

      <Card className="border-brand-green/30 bg-brand-green-light/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudUpload className="h-5 w-5 text-brand-green" />
            Forecast Data Import
          </CardTitle>
          <CardDescription>
            These are Fiverr <strong>accounts</strong> (not messages). Each person registers at /join with their name — accounts sync to their profile automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm font-medium text-neutral-700 mb-2">Ready to import</p>
            <ul className="text-sm text-neutral-600 space-y-1">
              <li>{FORECAST_ACCOUNTS.length} Fiverr accounts across {memberSummary.length} team members</li>
              {memberSummary.map(([name, count]) => (
                <li key={name} className="flex justify-between pl-2">
                  <span>{name}</span>
                  <span className="text-neutral-400">{count} accounts</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleForecastImport} disabled={importing}>
              {importing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CloudUpload className="h-4 w-4 mr-2" />}
              Import Forecast Data
            </Button>
            <Button variant="outline" onClick={copyJoinLink}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Registration Link
            </Button>
            <Button variant="outline" asChild>
              <Link href="/join" target="_blank">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open /join
              </Link>
            </Button>
          </div>

          {result && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm">
              <p className="font-medium text-green-800">Import complete</p>
              <ul className="mt-2 text-green-700 space-y-1">
                <li>{result.membersCreated} new team members created</li>
                <li>{result.membersExisting} existing members updated</li>
                <li>{result.accountsCreated} accounts imported</li>
                {result.accountsSkipped > 0 && <li>{result.accountsSkipped} duplicates skipped</li>}
              </ul>
              {result.errors.length > 0 && (
                <div className="mt-2 text-amber-700">
                  <p className="font-medium">{result.errors.length} warnings:</p>
                  <ul className="list-disc pl-4">{result.errors.slice(0, 5).map((e) => <li key={e}>{e}</li>)}</ul>
                </div>
              )}
              <p className="mt-3 text-green-800 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Send each person the registration link so they can claim their profile.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-brand-orange/30 bg-brand-orange-light/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-brand-orange" />
            Forecast Messages Import
          </CardTitle>
          <CardDescription>
            These are team <strong>messages</strong> (gig inquiries by service). Linked to each member by name — syncs when they register at /join.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-white p-4">
            <p className="text-sm font-medium text-neutral-700 mb-2">Ready to import</p>
            <ul className="text-sm text-neutral-600 space-y-1">
              <li>{messageTotal} messages across {messageMemberSummary.length} team members</li>
              {messageMemberSummary.map(([name, count]) => (
                <li key={name} className="flex justify-between pl-2">
                  <span>{name}</span>
                  <span className="text-neutral-400">{count} messages</span>
                </li>
              ))}
            </ul>
          </div>
          <Button onClick={handleMessageImport} disabled={importingMessages}>
            {importingMessages ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MessageSquare className="h-4 w-4 mr-2" />}
            Import Forecast Messages
          </Button>
          {messageResult && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm">
              <p className="font-medium text-green-800">Messages import complete</p>
              <ul className="mt-2 text-green-700 space-y-1">
                <li>{messageResult.messagesCreated} messages imported</li>
                <li>{messageResult.membersCreated} new team members created</li>
                {messageResult.membersExisting > 0 && <li>{messageResult.membersExisting} existing members linked</li>}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">Screenshot OCR import (coming soon)</p>
            <p className="mt-1">Use forecast import above for now. OCR from screenshots will be added later.</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 opacity-50">
        {steps.map((step) => (
          <div key={step.id} className="flex-1 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-neutral-200 text-neutral-400">
              <step.icon className="h-5 w-5" />
            </div>
            <p className="text-xs mt-2 text-neutral-600">{step.label}</p>
          </div>
        ))}
      </div>

      <Card className="opacity-50 pointer-events-none">
        <CardHeader>
          <CardTitle>Upload Screenshot</CardTitle>
          <CardDescription>PNG, JPG, or PDF — max 10MB</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="border-2 border-dashed border-neutral-300 rounded-xl p-12 text-center"
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <Upload className="h-10 w-10 text-neutral-400 mx-auto mb-4" />
            <p className="text-neutral-600 mb-2">Drag & drop a screenshot here, or click to browse</p>
            <input
              id="file-input"
              type="file"
              accept="image/png,image/jpeg,image/jpg,application/pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          {file && (
            <div className="mt-4 p-4 bg-neutral-50 rounded-lg flex items-center justify-between">
              <span className="text-sm">{file.name}</span>
              <Button disabled>Extract Data</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
