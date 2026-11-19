"use client";

import { Children, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

const PEEK = 54;
const STEP = 14;

function stackLayout(heights: number[], progress: number, gap: number) {
  const count = heights.length;
  const tops: number[] = [];
  let cursor = 0;
  for (let index = 0; index < count; index += 1) {
    tops.push(cursor);
    cursor += heights[index] + gap;
  }
  const expanded = Math.max(0, cursor - gap);
  const front = heights[0] ?? 0;
  const stacked = front + (count > 1 ? PEEK + Math.max(0, count - 2) * STEP : 0);
  const translates = heights.map((height, index) => {
    const stackedTop =
      index === 0 ? 0 : front - height + PEEK + (index - 1) * STEP;
    const desired = tops[index] * (1 - progress) + stackedTop * progress;
    return desired - tops[index];
  });
  return {
    translates,
    marginBottom: -progress * Math.max(0, expanded - stacked),
  };
}

function RollCard({
  index,
  count,
  translateY,
  onHeight,
  children,
}: {
  index: number;
  count: number;
  translateY: number;
  onHeight: (index: number, height: number) => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const angleRef = useRef(0);
  const [angle, setAngle] = useState(0);
  const [lifting, setLifting] = useState(false);
  const dragRef = useRef<{ pointerId: number; x: number; start: number; moved: boolean } | null>(null);
  const skipClickRef = useRef(false);
  const frameRef = useRef(0);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => {
      const next = Math.round(node.offsetHeight);
      if (next > 0) onHeight(index, next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [index, onHeight, children]);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  function animateTo(target: number) {
    cancelAnimationFrame(frameRef.current);
    const from = angleRef.current;
    const started = performance.now();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduced ? 0 : 780;
    const step = (now: number) => {
      const t = duration === 0 ? 1 : Math.min(1, (now - started) / duration);
      const eased = 1 - (1 - t) ** 3;
      const next = from + (target - from) * eased;
      angleRef.current = next;
      setAngle(next);
      if (t < 1) frameRef.current = requestAnimationFrame(step);
    };
    frameRef.current = requestAnimationFrame(step);
  }

  function onPointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      start: angleRef.current,
      moved: false,
    };
    setLifting(true);
  }

  function onPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    if (Math.abs(dx) > 4) drag.moved = true;
    const next = drag.start + (dx / 160) * 360;
    angleRef.current = next;
    setAngle(next);
  }

  function onPointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    dragRef.current = null;
    setLifting(false);
    if (!drag || !drag.moved) return;
    skipClickRef.current = true;
    event.preventDefault();
    const current = angleRef.current;
    const direction = current >= drag.start ? 1 : -1;
    const landed = direction > 0 ? Math.ceil(current / 360) * 360 : Math.floor(current / 360) * 360;
    animateTo(landed === current ? current + direction * 360 : landed);
  }

  return (
    <div
      ref={ref}
      className="roll-card"
      style={{
        transform: `translateY(${translateY}px) rotateY(${angle}deg)`,
        zIndex: lifting ? 80 : count - index,
      }}
    >
      <button
        type="button"
        className="roll-360"
        aria-label="Roll this card 360 degrees"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={() => {
          if (skipClickRef.current) {
            skipClickRef.current = false;
            return;
          }
          animateTo(angleRef.current + 360);
        }}
      >
        360°
      </button>
      {children}
    </div>
  );
}

export function Stage3D({
  children,
  enableStack = true,
  gap = 24,
}: {
  children: React.ReactNode;
  enableStack?: boolean;
  gap?: number;
}) {
  const items = Children.toArray(children).filter(Boolean);
  const [progress, setProgress] = useState(enableStack ? 1 : 0);
  const [heights, setHeights] = useState<number[]>(() => items.map(() => 0));
  const progressRef = useRef(progress);
  const listRef = useRef<HTMLDivElement>(null);
  progressRef.current = progress;

  const onHeight = useCallback((index: number, height: number) => {
    setHeights((current) => {
      if (current.length !== items.length) {
        const resized = items.map((_, itemIndex) => current[itemIndex] ?? 0);
        resized[index] = height;
        return resized;
      }
      if (Math.abs((current[index] ?? 0) - height) < 2) return current;
      const next = current.slice();
      next[index] = height;
      return next;
    });
  }, [items.length]);

  useEffect(() => {
    if (!enableStack) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setProgress(0);
      return;
    }
    const main = listRef.current?.closest("main");
    if (!main) return;

    const consume = (deltaY: number) => {
      const current = progressRef.current;
      const down = deltaY > 0;
      if (down && current > 0.004) {
        const next = Math.max(0, current - deltaY / 640);
        progressRef.current = next;
        setProgress(next);
        return true;
      }
      if (!down && main.scrollTop <= 2 && current < 0.996) {
        const next = Math.min(1, current + -deltaY / 640);
        progressRef.current = next;
        setProgress(next);
        return true;
      }
      return false;
    };

    const onWheel = (event: WheelEvent) => {
      if (consume(event.deltaY)) event.preventDefault();
    };

    let lastTouchY = 0;
    const onTouchStart = (event: TouchEvent) => {
      lastTouchY = event.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (event: TouchEvent) => {
      const y = event.touches[0]?.clientY ?? lastTouchY;
      const delta = lastTouchY - y;
      lastTouchY = y;
      if (Math.abs(delta) < 1) return;
      if (consume(delta)) event.preventDefault();
    };

    main.addEventListener("wheel", onWheel, { passive: false });
    main.addEventListener("touchstart", onTouchStart, { passive: true });
    main.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      main.removeEventListener("wheel", onWheel);
      main.removeEventListener("touchstart", onTouchStart);
      main.removeEventListener("touchmove", onTouchMove);
    };
  }, [enableStack]);

  const ready = heights.length === items.length && heights.every((height) => height > 0);
  const layout = stackLayout(ready ? heights : items.map(() => 0), enableStack && ready ? progress : 0, gap);
  const stacked = progress > 0.72;
  const open = progress < 0.08;

  return (
    <div className="stage-3d">
      <p className="roll-hint">
        {!enableStack
          ? "Tap 360° and drag to roll any card a full turn."
          : stacked
            ? "Scroll down to open every card. Tap 360° and drag to roll a card all the way around."
            : open
              ? "Scroll up at the top and the cards tuck into each other. Tap 360° to roll any card."
              : "Keep scrolling. Tap 360° to roll the card under your finger a full turn."}
      </p>
      <div
        ref={listRef}
        className="stack-list"
        style={{
          marginBottom: enableStack ? layout.marginBottom : undefined,
          display: "flex",
          flexDirection: "column",
          gap: enableStack ? undefined : gap,
        }}
      >
        {items.map((child, index) => (
          <RollCard
            key={index}
            index={index}
            count={items.length}
            translateY={layout.translates[index] ?? 0}
            onHeight={onHeight}
          >
            {child}
          </RollCard>
        ))}
      </div>
    </div>
  );
}
