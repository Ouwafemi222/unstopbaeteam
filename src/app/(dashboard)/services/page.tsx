"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, Plus, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { countMessagesForService } from "@/lib/services/message-match";
import type { Service } from "@/types/database";

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [messageCounts, setMessageCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  async function loadServices() {
    const [{ data: servicesData }, { data: messages }] = await Promise.all([
      supabase.from("services").select("*").order("name"),
      supabase.from("messages").select("service_id, gig_name"),
    ]);

    setServices(servicesData ?? []);

    const counts = new Map<string, number>();
    for (const service of servicesData ?? []) {
      counts.set(service.id, countMessagesForService(messages ?? [], service));
    }
    setMessageCounts(counts);
    setLoading(false);
  }

  useEffect(() => { loadServices(); }, []);

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const name = form.get("name") as string;
    const slug = name.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-");

    const { error } = await supabase.from("services").insert({ name, slug, description: (form.get("description") as string) || null });
    if (error) toast.error(error.message);
    else { toast.success("Service added"); setShowForm(false); loadServices(); }
    setSaving(false);
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-brand-green" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Services</h1>
          <p className="text-neutral-500 mt-1">Manage gig categories and services</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4" /> Add Service</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>New Service</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="flex gap-3 items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="name">Service Name</Label>
                <Input id="name" name="name" required placeholder="e.g. Website Development" />
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" name="description" placeholder="Optional" />
              </div>
              <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((s) => {
          const count = messageCounts.get(s.id) ?? 0;
          return (
            <Link key={s.id} href={`/services/${s.id}`}>
              <Card className="h-full transition-all hover:border-brand-green/40 hover:shadow-md cursor-pointer group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-neutral-900 group-hover:text-brand-green-dark transition-colors">
                      {s.name}
                    </h3>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {count > 0 && (
                        <Badge variant="neutral" className="text-xs">
                          {count} msg{count === 1 ? "" : "s"}
                        </Badge>
                      )}
                      <Badge variant={s.is_active ? "success" : "neutral"}>
                        {s.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  {s.description && (
                    <p className="text-sm text-neutral-500 mt-2 line-clamp-2">{s.description}</p>
                  )}
                  <p className="text-xs text-neutral-400 mt-3 flex items-center gap-1 group-hover:text-brand-green">
                    View members with messages
                    <ChevronRight className="h-3.5 w-3.5" />
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
