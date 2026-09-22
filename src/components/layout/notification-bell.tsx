"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Notification {
  id: string;
  title: string;
  message: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // ignore poll errors
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 120_000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  async function markRead(id: string) {
    const target = notifications.find((n) => n.id === id);
    if (!target || target.read_at) return;

    const now = new Date().toISOString();
    // Optimistic UI
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: now } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    setMarkingId(id);

    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Revert
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read_at: null } : n))
        );
        setUnreadCount((c) => c + 1);
        toast.error(data.error ?? "Could not mark as read");
        return;
      }
    } catch {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: null } : n))
      );
      setUnreadCount((c) => c + 1);
      toast.error("Network error — try again");
    } finally {
      setMarkingId(null);
    }
  }

  async function markAllRead() {
    if (unreadCount <= 0 || markingAll) return;

    const previous = notifications;
    const previousCount = unreadCount;
    const now = new Date().toISOString();

    setNotifications((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    setUnreadCount(0);
    setMarkingAll(true);

    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotifications(previous);
        setUnreadCount(previousCount);
        toast.error(data.error ?? "Could not mark all as read");
        return;
      }
      toast.success("All notifications marked as read");
      await load();
    } catch {
      setNotifications(previous);
      setUnreadCount(previousCount);
      toast.error("Network error — try again");
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="relative rounded-lg p-2 text-neutral-500 hover:bg-neutral-100"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 px-0.5 items-center justify-center rounded-full bg-brand-orange text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute right-0 z-50 mt-2 w-80 rounded-xl border bg-white shadow-lg"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-4 py-3 gap-2">
              <p className="font-semibold text-sm">Notifications</p>
              {unreadCount > 0 && (
                <button
                  type="button"
                  disabled={markingAll}
                  className="inline-flex items-center gap-1 text-xs font-medium text-brand-green hover:underline disabled:opacity-50"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    markAllRead();
                  }}
                >
                  {markingAll ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCheck className="h-3.5 w-3.5" />
                  )}
                  Mark all as read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="p-4 text-sm text-neutral-400 text-center">No notifications yet</p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`border-b px-4 py-3 text-sm ${
                      n.read_at ? "bg-white" : "bg-brand-green-light/20"
                    }`}
                  >
                    <p className="font-medium text-neutral-900">{n.title}</p>
                    <p className="text-neutral-500 mt-0.5">{n.message}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      {n.link && (
                        <Link
                          href={n.link}
                          className="text-brand-green text-xs font-medium hover:underline"
                          onClick={() => {
                            if (!n.read_at) markRead(n.id);
                            setOpen(false);
                          }}
                        >
                          View
                        </Link>
                      )}
                      {!n.read_at && (
                        <button
                          type="button"
                          disabled={markingId === n.id}
                          className="text-xs font-medium text-neutral-600 hover:text-brand-green hover:underline disabled:opacity-50"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            markRead(n.id);
                          }}
                        >
                          {markingId === n.id ? "Saving…" : "Mark as read"}
                        </button>
                      )}
                      {n.read_at && (
                        <span className="text-[11px] text-neutral-400">Read</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
