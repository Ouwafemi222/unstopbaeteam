"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";

type Shot = { x: number; y: number; zoom: number; panX: number; panY: number };

const REST: Shot = { x: 0, y: 0, zoom: 1, panX: 0, panY: 0 };

const BlenderActiveContext = createContext(false);

export function useBlenderActive() {
  return useContext(BlenderActiveContext);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function BlenderViewport({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(false);
  const [ready, setReady] = useState(false);
  const [shot, setShot] = useState<Shot>(REST);
  const shotRef = useRef(shot);
  const stageRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const userMoved = useRef(false);
  const homeRef = useRef<Shot>(REST);
  const dragRef = useRef<{
    id: number;
    mode: "orbit" | "pan";
    x: number;
    y: number;
    start: Shot;
  } | null>(null);
  shotRef.current = shot;

  function commit(next: Shot) {
    const clamped: Shot = {
      ...next,
      x: clamp(next.x, -62, 62),
      y: clamp(next.y, -70, 70),
      zoom: clamp(next.zoom, 0.08, 3.4),
    };
    shotRef.current = clamped;
    setShot(clamped);
  }

  useLayoutEffect(() => {
    if (!active) {
      userMoved.current = false;
      setReady(false);
      return;
    }
    const stage = stageRef.current;
    const board = boardRef.current;
    if (!stage || !board) return;

    const measure = () => {
      const boardW = board.offsetWidth;
      const boardH = board.offsetHeight;
      if (boardW < 40 || boardH < 40) return;
      const zoom = Math.min(
        (stage.clientWidth * 0.92) / boardW,
        (stage.clientHeight * 0.9) / boardH,
        1
      );
      const next: Shot = { x: 8, y: -10, zoom: Math.max(0.08, zoom), panX: 0, panY: 0 };
      homeRef.current = next;
      if (!userMoved.current) {
        commit(next);
        setReady(true);
      }
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(board);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [active]);

  useEffect(() => {
    const node = stageRef.current;
    if (!node || !active) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const start = shotRef.current;
      const factor = Math.exp(-event.deltaY * 0.0011);
      userMoved.current = true;
      commit({ ...start, zoom: start.zoom * factor });
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [active]);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!active || event.button > 2) return;
    const target = event.target as HTMLElement;
    if (target.closest("a, button, input, textarea, select, label")) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      id: event.pointerId,
      mode: event.button === 2 || event.shiftKey ? "pan" : "orbit",
      x: event.clientX,
      y: event.clientY,
      start: shotRef.current,
    };
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) < 3) return;
    userMoved.current = true;
    if (drag.mode === "pan") {
      commit({ ...drag.start, panX: drag.start.panX + dx, panY: drag.start.panY + dy });
      return;
    }
    commit({
      ...drag.start,
      y: drag.start.y + dx * 0.28,
      x: drag.start.x - dy * 0.22,
    });
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.id === event.pointerId) dragRef.current = null;
  }

  function zoomStep(factor: number) {
    const start = shotRef.current;
    userMoved.current = true;
    commit({ ...start, zoom: start.zoom * factor });
  }

  function showWholeDashboard() {
    userMoved.current = false;
    commit(homeRef.current);
    setReady(true);
  }

  function exitView() {
    userMoved.current = false;
    setReady(false);
    commit(REST);
    setActive(false);
  }

  const rigStyle = active
    ? { transform: `translate3d(${shot.panX}px, ${shot.panY}px, 0) scale(${shot.zoom})` }
    : undefined;
  const spinStyle = active
    ? { transform: `rotateX(${shot.x}deg) rotateY(${shot.y}deg)` }
    : undefined;

  return (
    <BlenderActiveContext.Provider value={active}>
      <div className={active ? `blender-viewport is-on${ready ? " is-ready" : ""}` : "blender-viewport"}>
        <div className="blender-bar">
          {active ? (
            <>
              <button type="button" className="blender-toggle" onClick={exitView}>
                Exit Blender view
              </button>
              <button type="button" className="blender-toggle blender-toggle-quiet" onClick={() => zoomStep(1.14)}>
                Zoom in
              </button>
              <button type="button" className="blender-toggle blender-toggle-quiet" onClick={() => zoomStep(1 / 1.14)}>
                Zoom out
              </button>
              <button type="button" className="blender-toggle blender-toggle-quiet" onClick={showWholeDashboard}>
                Whole dashboard
              </button>
              <span>Drag to turn. Scroll zooms on this angle. Shift+drag slides.</span>
            </>
          ) : (
            <>
              <button
                type="button"
                className="blender-toggle"
                onClick={() => {
                  userMoved.current = false;
                  setActive(true);
                }}
              >
                Blender view
              </button>
              <span>See the whole dashboard, then drag to look around and scroll to move closer.</span>
            </>
          )}
        </div>
        <div
          ref={stageRef}
          className="blender-stage"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onContextMenu={(event) => {
            if (active) event.preventDefault();
          }}
        >
          <div className="blender-rig" style={rigStyle}>
            <div className="blender-spin" style={spinStyle}>
              <div ref={boardRef} className="blender-board">
                {children}
              </div>
            </div>
          </div>
          {active && (
            <div className="blender-gizmo" aria-hidden>
              <div
                className="blender-gizmo-axes"
                style={{ transform: `rotateX(${shot.x}deg) rotateY(${shot.y}deg)` }}
              >
                <span className="axis axis-x" />
                <span className="axis axis-y" />
                <span className="axis axis-z" />
              </div>
            </div>
          )}
        </div>
      </div>
    </BlenderActiveContext.Provider>
  );
}
