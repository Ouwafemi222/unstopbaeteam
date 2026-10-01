"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { BOOKS_BUCKET, bookStoragePath } from "@/lib/team-blueprint/content";

const MAX_BYTES = 50 * 1024 * 1024;

interface BookUploadButtonProps {
  slug: string;
  hasFile: boolean;
}

export function BookUploadButton({ slug, hasFile }: BookUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  async function handleFile(file: File) {
    if (file.type !== "application/pdf") {
      toast.error("Please choose a PDF file");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("PDF must be 50 MB or smaller");
      return;
    }

    setUploading(true);
    const { error } = await createClient()
      .storage.from(BOOKS_BUCKET)
      .upload(bookStoragePath(slug), file, { upsert: true, contentType: "application/pdf" });
    setUploading(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(hasFile ? "Book replaced" : "Book uploaded");
    router.refresh();
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void handleFile(file);
        }}
      />
      <Button
        type="button"
        size="sm"
        variant={hasFile ? "outline" : "default"}
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Upload className="mr-2 h-4 w-4" />
        )}
        {hasFile ? "Replace PDF" : "Upload PDF"}
      </Button>
    </>
  );
}
