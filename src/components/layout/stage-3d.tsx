"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

export function Stage3D({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(event: React.MouseEvent<HTMLDivElement>) {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const x = event.clientX / Math.max(window.innerWidth, 1) - 0.5;
    const y = event.clientY / Math.max(window.innerHeight, 1) - 0.5;
    node.style.setProperty("--tilt-x", `${(-y * 3.2).toFixed(2)}deg`);
    node.style.setProperty("--tilt-y", `${(x * 4.2).toFixed(2)}deg`);
  }

  function onLeave() {
    const node = ref.current;
    if (!node) return;
    node.style.setProperty("--tilt-x", "0deg");
    node.style.setProperty("--tilt-y", "0deg");
  }

  return (
    <div className="stage-3d">
      <div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        className={cn("dash-3d space-y-6", className)}
      >
        {children}
      </div>
    </div>
  );
}
