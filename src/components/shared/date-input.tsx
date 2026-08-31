"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getTodayDate, getYesterdayDate } from "@/lib/utils/form-defaults";

interface DateInputProps {
  id?: string;
  name?: string;
  label?: string;
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  defaultToday?: boolean;
  showQuickButtons?: boolean;
}

export function DateInput({
  id = "date",
  name = "date",
  label = "Date",
  value,
  onChange,
  required,
  defaultToday = true,
  showQuickButtons = true,
}: DateInputProps) {
  const defaultVal = defaultToday ? getTodayDate() : "";

  function setDate(d: string) {
    onChange?.(d);
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (el) el.value = d;
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        type="date"
        required={required}
        defaultValue={value ?? defaultVal}
        value={onChange ? value : undefined}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      />
      {showQuickButtons && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setDate(getTodayDate())}>
            Today
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setDate(getYesterdayDate())}>
            Yesterday
          </Button>
        </div>
      )}
    </div>
  );
}

interface TimeInputProps {
  id?: string;
  name?: string;
  label?: string;
  defaultValue?: string;
}

export function TimeInput({
  id = "time",
  name = "time",
  label = "Time (optional)",
  defaultValue,
}: TimeInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} type="time" defaultValue={defaultValue} />
    </div>
  );
}
