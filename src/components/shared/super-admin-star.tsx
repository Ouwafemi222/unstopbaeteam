import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface SuperAdminStarProps {
  /** visual size */
  size?: "sm" | "md" | "lg";
  /** show "SA" abbreviation next to the star */
  showLabel?: boolean;
  className?: string;
}

const sizeMap = {
  sm: { wrap: "h-5 w-5", icon: "h-2.5 w-2.5", text: "text-[9px]" },
  md: { wrap: "h-6 w-6", icon: "h-3 w-3", text: "text-[10px]" },
  lg: { wrap: "h-7 w-7", icon: "h-3.5 w-3.5", text: "text-xs" },
};

/** Gold star badge marking Super Admin (abbreviated SA). */
export function SuperAdminStar({ size = "md", showLabel = false, className }: SuperAdminStarProps) {
  const s = sizeMap[size];

  return (
    <span
      title="Super Admin"
      aria-label="Super Admin"
      className={cn(
        "inline-flex items-center gap-1",
        className
      )}
    >
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-sm ring-2 ring-white",
          s.wrap
        )}
      >
        <Star className={cn(s.icon, "fill-white")} />
      </span>
      {showLabel && (
        <span
          className={cn(
            "font-bold uppercase tracking-wide text-amber-700",
            s.text
          )}
        >
          SA · Super Admin
        </span>
      )}
    </span>
  );
}
