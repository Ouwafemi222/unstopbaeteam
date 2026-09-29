"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Globe2, Search, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  countryPickerLabel,
  filterCountries,
  sortCountriesForPicker,
} from "@/lib/countries/picker";
import type { Country } from "@/types/database";

interface CountrySelectProps {
  countries: Country[];
  name?: string;
  id?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  label?: string;
}

export function CountrySelect({
  countries,
  name = "country_id",
  id = "country_id",
  value,
  defaultValue,
  onChange,
  required,
  label = "Country",
}: CountrySelectProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const isControlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue ?? "");
  const selectedId = isControlled ? value : internal;

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = useMemo(
    () => countries.find((c) => c.id === selectedId),
    [countries, selectedId]
  );

  const filtered = useMemo(() => filterCountries(countries, search), [countries, search]);
  const pinnedWhenEmpty = useMemo(() => sortCountriesForPicker(countries), [countries]);
  const showPinned = !search.trim();

  function commit(nextId: string) {
    if (!isControlled) setInternal(nextId);
    onChange?.(nextId);
    setOpen(false);
    setSearch("");
  }

  function clearSelection(e: React.MouseEvent) {
    e.stopPropagation();
    commit("");
  }

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => searchRef.current?.focus(), 0);
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("mousedown", onDoc);
    };
  }, [open]);

  return (
    <div className="space-y-2" ref={rootRef}>
      <Label htmlFor={id}>{label}</Label>
      <input type="hidden" name={name} id={id} value={selectedId} required={required && !selectedId} />

      <div className="relative">
        <div
          className={cn(
            "flex h-11 w-full items-center gap-1 rounded-lg border bg-white pl-3 pr-1 text-sm transition-colors",
            "border-neutral-200 focus-within:border-brand-green focus-within:ring-2 focus-within:ring-brand-green/20",
            open && "border-brand-green ring-2 ring-brand-green/20"
          )}
        >
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={listId}
            onClick={() => setOpen((o) => !o)}
            className={cn(
              "flex min-w-0 flex-1 items-center gap-2 py-2 text-left focus-visible:outline-none",
              !selected && "text-neutral-400"
            )}
          >
            {selected ? (
              <>
                <span className="text-lg leading-none" aria-hidden>
                  {selected.flag_emoji}
                </span>
                <span className="truncate font-medium text-neutral-900">
                  {countryPickerLabel(selected)}
                </span>
              </>
            ) : (
              <>
                <Globe2 className="h-4 w-4 shrink-0 text-neutral-400" />
                <span className="truncate">Select country…</span>
              </>
            )}
          </button>
          {selected && (
            <button
              type="button"
              onClick={clearSelection}
              className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
              aria-label="Clear country"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100"
            aria-label={open ? "Close country list" : "Open country list"}
          >
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
            />
          </button>
        </div>

        {open && (
          <div
            className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg shadow-neutral-900/10"
            role="listbox"
            id={listId}
          >
            <div className="border-b border-neutral-100 p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search UK, Nigeria, US…"
                  className="h-9 w-full rounded-lg border border-neutral-200 bg-neutral-50/80 pl-8 pr-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                  autoComplete="off"
                />
              </div>
            </div>

            <ul className="max-h-56 overflow-y-auto p-1.5">
              {showPinned && (
                <>
                  <li className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Common
                  </li>
                  {pinnedWhenEmpty.slice(0, 7).map((c) => (
                    <CountryOption
                      key={`pin-${c.id}`}
                      country={c}
                      selected={c.id === selectedId}
                      onPick={() => commit(c.id)}
                    />
                  ))}
                  <li className="my-1 border-t border-neutral-100" aria-hidden />
                  <li className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    All countries
                  </li>
                </>
              )}

              {filtered.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-neutral-500">No country matches “{search}”</li>
              ) : showPinned ? (
                countries
                  .filter((c) => !pinnedWhenEmpty.slice(0, 7).some((p) => p.id === c.id))
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((c) => (
                    <CountryOption
                      key={c.id}
                      country={c}
                      selected={c.id === selectedId}
                      onPick={() => commit(c.id)}
                    />
                  ))
              ) : (
                filtered.map((c) => (
                  <CountryOption
                    key={c.id}
                    country={c}
                    selected={c.id === selectedId}
                    onPick={() => commit(c.id)}
                  />
                ))
              )}
            </ul>
          </div>
        )}
      </div>
      <p className="text-xs text-neutral-500">
        UK accounts: choose <span className="font-medium text-neutral-700">United Kingdom (UK)</span>.
      </p>
    </div>
  );
}

function CountryOption({
  country,
  selected,
  onPick,
}: {
  country: Country;
  selected: boolean;
  onPick: () => void;
}) {
  return (
    <li role="option" aria-selected={selected}>
      <button
        type="button"
        onClick={onPick}
        className={cn(
          "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
          selected
            ? "bg-brand-green/10 font-semibold text-brand-green-dark"
            : "text-neutral-800 hover:bg-neutral-50"
        )}
      >
        <span className="text-base leading-none">{country.flag_emoji}</span>
        <span className="truncate">{countryPickerLabel(country)}</span>
        <span className="ml-auto text-xs text-neutral-400">{country.code}</span>
      </button>
    </li>
  );
}
