"use client";

import { useMemo, useState } from "react";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return countries;
    const q = search.toLowerCase();
    return countries.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [countries, search]);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        type="text"
        placeholder="Search country..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-1"
      />
      <Select
        id={id}
        name={name}
        required={required}
        value={onChange ? value : undefined}
        defaultValue={!onChange ? (defaultValue ?? value ?? "") : undefined}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      >
        <option value="">Select country...</option>
        {filtered.map((c) => (
          <option key={c.id} value={c.id}>
            {c.flag_emoji} {c.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
