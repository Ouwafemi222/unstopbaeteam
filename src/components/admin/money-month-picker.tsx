"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";
import {
  buildYearMonthOptions,
  formatYearMonthLabel,
  groupYearMonthOptionsByYear,
  currentYearMonth,
} from "@/lib/utils/dates";

function adminYearMonthOptions(): string[] {
  const current = currentYearMonth();
  const [y] = current.split("-").map(Number);
  const opts: string[] = [];
  for (let year = y - 1; year <= y + 1; year++) {
    for (let month = 1; month <= 12; month++) {
      const ym = `${year}-${String(month).padStart(2, "0")}`;
      if (ym <= current || year === y) opts.push(ym);
    }
  }
  const forward = buildYearMonthOptions(1);
  return [...new Set([...opts, ...forward])].sort();
}

export function MoneyMonthPicker({ value }: { value: string }) {
  const router = useRouter();
  const options = adminYearMonthOptions();
  const byYear = groupYearMonthOptionsByYear(options);

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="moneyMonth" className="text-sm text-neutral-500 whitespace-nowrap">
        Month
      </label>
      <Select
        id="moneyMonth"
        value={value}
        onChange={(e) => {
          router.push(`/money?month=${e.target.value}`);
        }}
        className="min-w-[180px]"
      >
        {[...byYear.entries()].map(([year, months]) => (
          <optgroup key={year} label={year}>
            {months.map((ym) => (
              <option key={ym} value={ym}>
                {formatYearMonthLabel(ym)}
              </option>
            ))}
          </optgroup>
        ))}
      </Select>
    </div>
  );
}
