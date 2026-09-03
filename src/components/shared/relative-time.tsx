"use client";

import { useEffect, useState } from "react";
import { formatDateTime } from "@/lib/utils";

function getRelative(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = Math.round((now - then) / 1000); // seconds
  if (diff < 60) return "just now";
  if (diff < 3600) {
    const m = Math.floor(diff / 60);
    return `${m} minute${m === 1 ? "" : "s"} ago`;
  }
  if (diff < 86400) {
    const h = Math.floor(diff / 3600);
    return `${h} hour${h === 1 ? "" : "s"} ago`;
  }
  const d = Math.floor(diff / 86400);
  if (d === 1) return "yesterday";
  if (d < 7) return `${d} days ago`;
  return formatDateTime(iso);
}

/** Live relative time — e.g. "5 minutes ago". Updates every 30s. */
export function RelativeTime({
  iso,
  className,
}: {
  iso: string;
  className?: string;
}) {
  const [text, setText] = useState(() => getRelative(iso));

  useEffect(() => {
    setText(getRelative(iso));
    const id = setInterval(() => setText(getRelative(iso)), 30_000);
    return () => clearInterval(id);
  }, [iso]);

  return (
    <time
      dateTime={iso}
      className={className}
      title={formatDateTime(iso)}
    >
      {text}
    </time>
  );
}
