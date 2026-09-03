"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ClipboardPaste, ImagePlus, Loader2, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  accountVerificationScreenshotPath,
  getMemberImageUrl,
  uploadMemberImage,
} from "@/lib/storage/member-uploads";

const MAX_SCREENSHOT_BYTES = 1024 * 1024;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

interface PendingScreenshot {
  id: string;
  file: File;
  previewUrl: string;
}

interface SavedScreenshot {
  path: string;
  url: string;
}

export interface AccountVerificationCaptureProps {
  teamMemberId: string;
  accountId?: string;
  initialCode?: string | null;
  initialPaths?: string[];
  readOnly?: boolean;
  /** When true, parent handles save (form submit). Exposes values via hidden inputs. */
  embeddedInForm?: boolean;
  onCodeChange?: (code: string) => void;
  onPendingFilesChange?: (files: File[]) => void;
  onRemovedPathsChange?: (paths: string[]) => void;
}

export function AccountVerificationCapture({
  teamMemberId,
  accountId,
  initialCode = "",
  initialPaths = [],
  readOnly,
  embeddedInForm,
  onCodeChange,
  onPendingFilesChange,
  onRemovedPathsChange,
}: AccountVerificationCaptureProps) {
  const supabase = createClient();
  const pasteRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [code, setCode] = useState(initialCode ?? "");
  const [pending, setPending] = useState<PendingScreenshot[]>([]);
  const [saved, setSaved] = useState<SavedScreenshot[]>([]);
  const [removedPaths, setRemovedPaths] = useState<string[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);

  useEffect(() => {
    setCode(initialCode ?? "");
  }, [initialCode]);

  const loadSavedUrls = useCallback(async () => {
    const paths = initialPaths.filter((p) => !removedPaths.includes(p));
    if (paths.length === 0) {
      setSaved([]);
      return;
    }
    setLoadingSaved(true);
    const urls = await Promise.all(
      paths.map(async (path) => ({
        path,
        url: (await getMemberImageUrl(supabase, path)) ?? "",
      }))
    );
    setSaved(urls.filter((s) => s.url));
    setLoadingSaved(false);
  }, [supabase, initialPaths, removedPaths]);

  useEffect(() => {
    loadSavedUrls();
  }, [loadSavedUrls]);

  useEffect(() => {
    onCodeChange?.(code);
  }, [code, onCodeChange]);

  useEffect(() => {
    onPendingFilesChange?.(pending.map((p) => p.file));
  }, [pending, onPendingFilesChange]);

  useEffect(() => {
    onRemovedPathsChange?.(removedPaths);
  }, [removedPaths, onRemovedPathsChange]);

  function handleCodeInput(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    setCode(digits);
  }

  function addImageFile(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Use PNG, JPG, or WEBP images");
      return;
    }
    if (file.size > MAX_SCREENSHOT_BYTES) {
      toast.error("Screenshot must be under 1MB");
      return;
    }
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setPending((prev) => [
      ...prev,
      { id, file, previewUrl: URL.createObjectURL(file) },
    ]);
  }

  function handlePaste(e: React.ClipboardEvent) {
    if (readOnly) return;
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          addImageFile(file);
          toast.success("Screenshot pasted");
        }
        return;
      }
    }
  }

  function removePending(id: string) {
    setPending((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }

  function removeSaved(path: string) {
    setRemovedPaths((prev) => [...prev, path]);
    setSaved((prev) => prev.filter((s) => s.path !== path));
  }

  const totalCount = saved.length + pending.length;
  const needsAccountForUpload = !accountId && !embeddedInForm;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="verification_code">4-digit verification code</Label>
        <Input
          id="verification_code"
          name="verification_code"
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          placeholder="e.g. 1234"
          value={code}
          onChange={(e) => handleCodeInput(e.target.value)}
          disabled={readOnly}
          className="h-11 max-w-[10rem] font-mono text-lg tracking-[0.3em]"
        />
        <p className="text-xs text-neutral-500">
          The four-digit code Fiverr sends to verify this account.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Verification screenshots</Label>
        {!readOnly && (
          <div
            ref={pasteRef}
            tabIndex={0}
            onPaste={handlePaste}
            className={cn(
              "rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors outline-none",
              "border-neutral-200 bg-neutral-50/80 hover:border-brand-green/40 focus:border-brand-green/50"
            )}
          >
            <ClipboardPaste className="h-8 w-8 text-neutral-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-neutral-800">
              Click here and paste a screenshot (Ctrl+V)
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              Or upload an image — verification screen, SMS code, email proof, etc.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus className="h-4 w-4" />
                Upload image
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) addImageFile(file);
                e.target.value = "";
              }}
            />
          </div>
        )}

        {needsAccountForUpload && pending.length > 0 && embeddedInForm && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Screenshots will upload when you save the account.
          </p>
        )}

        {loadingSaved && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-brand-green" />
          </div>
        )}

        {totalCount > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {saved.map((s) => (
              <div key={s.path} className="relative group rounded-lg border overflow-hidden bg-neutral-100 aspect-video">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.url} alt="Verification screenshot" className="w-full h-full object-contain" />
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => removeSaved(s.path)}
                    className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove screenshot"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            {pending.map((p) => (
              <div key={p.id} className="relative group rounded-lg border overflow-hidden bg-neutral-100 aspect-video">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.previewUrl} alt="Pending screenshot" className="w-full h-full object-contain" />
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => removePending(p.id)}
                    className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove pending screenshot"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {readOnly && totalCount === 0 && !code && (
          <p className="text-sm text-neutral-500">No verification code or screenshots yet.</p>
        )}
      </div>
    </div>
  );
}

/** Upload pending files and return merged storage paths. */
export async function uploadVerificationScreenshots(
  supabase: ReturnType<typeof createClient>,
  teamMemberId: string,
  accountId: string,
  pendingFiles: File[],
  existingPaths: string[],
  removedPaths: string[]
) {
  const kept = existingPaths.filter((p) => !removedPaths.includes(p));
  const uploaded: string[] = [];

  for (const file of pendingFiles) {
    const ext = file.name.split(".").pop() ?? "png";
    const path = accountVerificationScreenshotPath(teamMemberId, accountId, ext);
    await uploadMemberImage(supabase, file, path);
    uploaded.push(path);
  }

  return [...kept, ...uploaded];
}
