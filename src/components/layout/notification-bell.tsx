"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

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

  async function load() {
    const res = await fetch("/api/notifications");
    if (!res.ok) return;
    const data = await res.json();
    setNotifications(data.notifications ?? []);
    setUnreadCount(data.unreadCount ?? 0);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  async function markRead(id: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    load();
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="relative rounded-lg p-2 text-neutral-500 hover:bg-neutral-100"
        onClick={() => setOpen(!open)}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-orange text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border bg-white shadow-lg">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <p className="font-semibold text-sm">Notifications</p>
              {unreadCount > 0 && (
                <button type="button" className="text-xs text-brand-green hover:underline" onClick={markAllRead}>
                  Mark all read
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
                    className={`border-b px-4 py-3 text-sm ${n.read_at ? "bg-white" : "bg-brand-green-light/20"}`}
                  >
                    <p className="font-medium text-neutral-900">{n.title}</p>
                    <p className="text-neutral-500 mt-0.5">{n.message}</p>
                    {n.link && (
                      <Link
                        href={n.link}
                        className="text-brand-green text-xs mt-1 inline-block hover:underline"
                        onClick={() => { markRead(n.id); setOpen(false); }}
                      >
                        View
                      </Link>
                    )}
                    {!n.read_at && (
                      <button type="button" className="text-xs text-neutral-400 mt-1 block hover:underline" onClick={() => markRead(n.id)}>
                        Mark read
                      </button>
                    )}
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
