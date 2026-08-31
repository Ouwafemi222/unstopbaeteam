"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, Briefcase, Globe, Wrench, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { SearchResult } from "@/types/database";
import { cn } from "@/lib/utils";

const typeIcons: Record<string, React.ElementType> = {
  team_member: Users,
  fiverr_account: Briefcase,
  service: Wrench,
  country: Globe,
};

const typeLabels: Record<string, string> = {
  team_member: "Team Member",
  fiverr_account: "Fiverr Account",
  service: "Service",
  country: "Country",
};

const typeRoutes: Record<string, (id: string) => string> = {
  team_member: (id) => `/team-members/${id}`,
  fiverr_account: (id) => `/accounts/${id}`,
  service: () => `/services`,
  country: () => `/accounts`,
};

interface GlobalSearchProps {
  className?: string;
  large?: boolean;
}

export function GlobalSearch({ className, large }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const router = useRouter();
  const supabase = createClient();

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc("global_search", { search_query: q, result_limit: 15 });
    if (error) {
      console.error("global_search error:", error.message);
      setResults([]);
    } else {
      setResults(data ?? []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  useEffect(() => {
    const stored = localStorage.getItem("recent_searches");
    if (stored) setRecentSearches(JSON.parse(stored));
  }, []);

  function saveRecentSearch(q: string) {
    const updated = [q, ...recentSearches.filter((s) => s !== q)].slice(0, 8);
    setRecentSearches(updated);
    localStorage.setItem("recent_searches", JSON.stringify(updated));
  }

  function navigateToResult(result: SearchResult) {
    const route = typeRoutes[result.result_type]?.(result.result_id);
    if (route) {
      saveRecentSearch(query);
      setIsOpen(false);
      setQuery("");
      router.push(route);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      navigateToResult(results[selectedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <Input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); setSelectedIndex(-1); }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search member, Gmail, phone, Fiverr account, country..."
          className={cn("pl-10 bg-neutral-50 border-neutral-200", large && "h-12 text-base")}
        />
      </div>

      {isOpen && (query.length >= 2 || recentSearches.length > 0) && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 z-50 mt-2 max-h-96 overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-lg">
            {loading && (
              <div className="p-4 text-sm text-neutral-500">Searching...</div>
            )}

            {!loading && query.length >= 2 && results.length === 0 && (
              <div className="p-4 text-sm text-neutral-500">No results found for &quot;{query}&quot;</div>
            )}

            {results.map((result, i) => {
              const Icon = typeIcons[result.result_type] ?? Search;
              return (
                <button
                  key={`${result.result_type}-${result.result_id}`}
                  onClick={() => navigateToResult(result)}
                  className={cn(
                    "flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-neutral-50 transition-colors",
                    selectedIndex === i && "bg-brand-green/5"
                  )}
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-neutral-900 truncate">{result.title}</p>
                    <p className="text-xs text-neutral-500">{typeLabels[result.result_type]} — {result.subtitle}</p>
                  </div>
                </button>
              );
            })}

            {!loading && query.length < 2 && recentSearches.length > 0 && (
              <div>
                <p className="px-4 py-2 text-xs font-medium text-neutral-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Recent Searches
                </p>
                {recentSearches.map((s) => (
                  <button
                    key={s}
                    onClick={() => setQuery(s)}
                    className="flex w-full px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
