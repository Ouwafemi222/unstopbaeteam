"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export function EvidencePreview({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full cursor-zoom-in text-left"
        aria-label={`Preview ${alt}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className={className} />
      </button>
      {open &&
        createPortal(
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-8" role="dialog" aria-modal="true" aria-label={alt}>
            <button
              type="button"
              className="absolute inset-0 bg-[#2a1018]/55 backdrop-blur-[2px]"
              aria-label="Close preview"
              onClick={() => setOpen(false)}
            />
            <div className="relative z-10 flex max-h-full max-w-5xl flex-col items-center">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="absolute -top-3 right-0 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white text-neutral-800 shadow-lg sm:-right-3"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={alt}
                className="max-h-[85vh] w-auto max-w-full rounded-2xl bg-white object-contain shadow-2xl"
              />
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
