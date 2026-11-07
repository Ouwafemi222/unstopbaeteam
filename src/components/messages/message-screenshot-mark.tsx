"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

const COLORS = [
  { label: "Red", value: "#e11d48" },
  { label: "Blue", value: "#2563eb" },
  { label: "Green", value: "#15803d" },
  { label: "Orange", value: "#ea580c" },
];

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  color: string;
  size: number;
  points: Point[];
}

export interface MessageScreenshotMarkHandle {
  hasMark: () => boolean;
  exportImage: () => Promise<File | null>;
}

export const MessageScreenshotMark = forwardRef<
  MessageScreenshotMarkHandle,
  { file: File; onChange?: () => void }
>(function MessageScreenshotMark({ file, onChange }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const drawing = useRef<Stroke | null>(null);
  const [color, setColor] = useState(COLORS[0].value);
  const [size, setSize] = useState(6);
  const [ready, setReady] = useState(false);
  const [markCount, setMarkCount] = useState(0);

  function paint() {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const stroke of [...strokesRef.current, drawing.current].filter(Boolean) as Stroke[]) {
      if (stroke.points.length === 0) continue;
      context.strokeStyle = stroke.color;
      context.lineWidth = stroke.size;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.beginPath();
      stroke.points.forEach((point, index) => {
        if (index === 0) context.moveTo(point.x, point.y);
        else context.lineTo(point.x, point.y);
      });
      context.stroke();
    }
  }

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const maxWidth = 1400;
      const scale = image.width > maxWidth ? maxWidth / image.width : 1;
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      imageRef.current = image;
      strokesRef.current = [];
      setMarkCount(0);
      setReady(true);
      paint();
    };
    image.src = url;
    return () => {
      URL.revokeObjectURL(url);
      imageRef.current = null;
      setReady(false);
    };
    // paint closes over the latest strokes via refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  useImperativeHandle(ref, () => ({
    hasMark: () => strokesRef.current.length > 0,
    exportImage: () =>
      new Promise((resolve) => {
        const canvas = canvasRef.current;
        if (!canvas || !imageRef.current) {
          resolve(null);
          return;
        }
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(null);
              return;
            }
            resolve(new File([blob], "message-evidence.jpg", { type: "image/jpeg" }));
          },
          "image/jpeg",
          0.9
        );
      }),
  }));

  function pointFromEvent(event: React.PointerEvent<HTMLCanvasElement>): Point {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function startDraw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!ready) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = { color, size, points: [pointFromEvent(event)] };
    paint();
  }

  function moveDraw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    drawing.current.points.push(pointFromEvent(event));
    paint();
  }

  function endDraw() {
    if (!drawing.current) return;
    if (drawing.current.points.length > 1) {
      strokesRef.current = [...strokesRef.current, drawing.current];
      setMarkCount(strokesRef.current.length);
      onChange?.();
    }
    drawing.current = null;
    paint();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-neutral-500">Pencil</span>
        {COLORS.map((swatch) => (
          <button
            key={swatch.value}
            type="button"
            aria-label={`${swatch.label} pencil`}
            aria-pressed={color === swatch.value}
            onClick={() => setColor(swatch.value)}
            className={`h-7 w-7 rounded-full border-2 ${
              color === swatch.value ? "border-neutral-900" : "border-white"
            }`}
            style={{ backgroundColor: swatch.value }}
          />
        ))}
        <button
          type="button"
          className={`rounded-full border px-2.5 py-1 text-xs ${size === 4 ? "border-[#7b1e3a] text-[#7b1e3a]" : "border-neutral-200 text-neutral-500"}`}
          onClick={() => setSize(4)}
        >
          Thin
        </button>
        <button
          type="button"
          className={`rounded-full border px-2.5 py-1 text-xs ${size === 8 ? "border-[#7b1e3a] text-[#7b1e3a]" : "border-neutral-200 text-neutral-500"}`}
          onClick={() => setSize(8)}
        >
          Thick
        </button>
        <button
          type="button"
          className="rounded-full border border-neutral-200 px-2.5 py-1 text-xs text-neutral-600"
          onClick={() => {
            strokesRef.current = strokesRef.current.slice(0, -1);
            setMarkCount(strokesRef.current.length);
            onChange?.();
            paint();
          }}
        >
          Undo
        </button>
        <button
          type="button"
          className="rounded-full border border-neutral-200 px-2.5 py-1 text-xs text-neutral-600"
          onClick={() => {
            strokesRef.current = [];
            setMarkCount(0);
            onChange?.();
            paint();
          }}
        >
          Clear
        </button>
      </div>
      <p className="text-xs text-neutral-500">
        Circle the date on the screenshot. The circle stays on the evidence, and OCR reads the picture for the admin.
        {markCount > 0 ? ` ${markCount} mark${markCount === 1 ? "" : "s"} on the picture.` : ""}
      </p>
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
        <canvas
          ref={canvasRef}
          className="h-auto max-h-[420px] w-full touch-none cursor-crosshair"
          onPointerDown={startDraw}
          onPointerMove={moveDraw}
          onPointerUp={endDraw}
          onPointerCancel={endDraw}
        />
      </div>
    </div>
  );
});
