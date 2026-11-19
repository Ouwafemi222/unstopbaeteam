"use client";

import { useEffect, useRef, useState } from "react";

type Orbit = { x: number; y: number; zoom: number; panX: number; panY: number };

const FLAT: Orbit = { x: 0, y: 0, zoom: 1, panX: 0, panY: 0 };
const HOME: Orbit = { x: 28, y: -36, zoom: 0.78, panX: 0, panY: 0 };

export function BlenderViewport({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(false);
  const [orbit, setOrbit] = useState<Orbit>(FLAT);
  const orbitRef = useRef(orbit);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    id: number;
    mode: "orbit" | "pan";
    x: number;
    y: number;
    start: Orbit;
  } | null>(null);
  orbitRef.current = orbit;

  function apply(next: Orbit) {
    const clamped = { ...next, x: Math.max(-89, Math.min(89, next.x)) };
    orbitRef.current = clamped;
    setOrbit(clamped);
  }

  useEffect(() => {
    const node = stageRef.current;
    if (!node || !active) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const start = orbitRef.current;
      const zoom = Math.max(0.45, Math.min(1.75, start.zoom * (event.deltaY > 0 ? 0.94 : 1.06)));
      apply({ ...start, zoom });
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [active]);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!active) return;
    const target = event.target as HTMLElement;
    const onPad = Boolean(target.closest("[data-orbit-pad]"));
    const onControl = Boolean(target.closest("a, button, input, textarea, select, label"));
    if (onControl && !onPad) return;
    const pan = event.shiftKey && !onPad;
    const orbitGesture = event.altKey || onPad;
    if (!pan && !orbitGesture) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      id: event.pointerId,
      mode: pan ? "pan" : "orbit",
      x: event.clientX,
      y: event.clientY,
      start: orbitRef.current,
    };
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (drag.mode === "pan") {
      apply({ ...drag.start, panX: drag.start.panX + dx, panY: drag.start.panY + dy });
      return;
    }
    apply({ ...drag.start, y: drag.start.y + dx * 0.45, x: drag.start.x - dy * 0.35 });
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.id === event.pointerId) dragRef.current = null;
  }

  const scene = active
    ? `translate3d(${orbit.panX}px, ${orbit.panY}px, 0) scale(${orbit.zoom}) rotateX(${orbit.x}deg) rotateY(${orbit.y}deg)`
    : undefined;

  return (
    <div className={active ? "blender-viewport is-on" : "blender-viewport"}>
      <div className="blender-bar">
        {active ? (
          <>
            <button type="button" className="blender-toggle" onClick={() => { apply(FLAT); setActive(false); }}>
              Exit Blender view
            </button>
            <button type="button" className="blender-toggle blender-toggle-quiet" onClick={() => apply(HOME)}>
              Reset view
            </button>
            <span>Alt+drag orbits. Scroll zooms. Shift+drag pans. Drag the axes too.</span>
          </>
        ) : (
          <>
            <button type="button" className="blender-toggle" onClick={() => { apply(HOME); setActive(true); }}>
              Blender view
            </button>
            <span>Open a 3D view and orbit this dashboard.</span>
          </>
        )}
      </div>
      <div
        ref={stageRef}
        className="blender-stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div className="blender-camera">
          <div className="blender-scene" style={scene ? { transform: scene } : undefined}>
            {active && <div className="blender-floor" aria-hidden />}
            <div className="blender-content">{children}</div>
          </div>
        </div>
        {active && (
          <div className="blender-gizmo" data-orbit-pad>
            <div
              className="blender-gizmo-axes"
              style={{ transform: `rotateX(${orbit.x}deg) rotateY(${orbit.y}deg)` }}
            >
              <span className="axis axis-x" />
              <span className="axis axis-y" />
              <span className="axis axis-z" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
