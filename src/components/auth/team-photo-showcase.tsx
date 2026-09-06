"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Laptop, Smartphone } from "lucide-react";

const TEAM_PHOTOS = [
  { src: "/team/team-1.png", alt: "Unstoppable Team group photo 1" },
  { src: "/team/team-2.png", alt: "Unstoppable Team group photo 2" },
  { src: "/team/team-3.png", alt: "Unstoppable Team group photo 3" },
  { src: "/team/team-4.png", alt: "Unstoppable Team group photo 4" },
  { src: "/team/team-5.png", alt: "Unstoppable Team group photo 5" },
];

const SLIDE_DURATION = 5500;

type Phase = "enter" | "hold" | "exit";

export function TeamPhotoShowcase() {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("enter");

  useEffect(() => {
    const enterTimer = setTimeout(() => setPhase("hold"), 900);
    const exitTimer = setTimeout(() => setPhase("exit"), SLIDE_DURATION - 900);
    const nextTimer = setTimeout(() => {
      setIndex((i) => (i + 1) % TEAM_PHOTOS.length);
      setPhase("enter");
    }, SLIDE_DURATION);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(exitTimer);
      clearTimeout(nextTimer);
    };
  }, [index]);

  const photo = TEAM_PHOTOS[index];

  return (
    <div className="relative hidden lg:flex lg:w-1/2 flex-col overflow-hidden bg-neutral-950">
      {/* Full-bleed clear photo */}
      <div className="absolute inset-0 z-0">
        <div
          key={index}
          className={`absolute inset-0 ${
            phase === "enter"
              ? "team-photo-enter"
              : phase === "exit"
                ? "team-photo-exit"
                : "team-photo-heartbeat"
          }`}
        >
          <Image
            src={photo.src}
            alt={photo.alt}
            fill
            className="object-cover object-center"
            priority={index === 0}
            quality={95}
            sizes="50vw"
          />
        </div>
      </div>

      {/* Soft vignette only at edges — keeps faces clear in the center */}
      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.28)_100%)]" />

      {/* Bottom readability gradient for brand text only */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-2/5 bg-gradient-to-t from-black/75 via-black/35 to-transparent" />

      {/* Branding */}
      <div className="relative z-20 mt-auto p-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 backdrop-blur-md ring-1 ring-white/25">
            <Laptop className="h-6 w-6 text-white" />
            <Smartphone className="h-3.5 w-3.5 -ml-1 text-white" />
          </div>
          <div>
            <p className="text-xl font-bold text-white leading-tight drop-shadow-sm">UNSTOPPABLE</p>
            <p className="text-sm font-semibold text-brand-orange-light">TEAM</p>
          </div>
        </div>
        <p className="text-white/95 text-sm leading-relaxed max-w-sm drop-shadow-sm">
          Your internal command center for managing Fiverr accounts, tracking messages, and
          monitoring team performance.
        </p>

        <div className="flex gap-2 mt-6">
          {TEAM_PHOTOS.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to photo ${i + 1}`}
              onClick={() => {
                setIndex(i);
                setPhase("enter");
              }}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i === index ? "w-8 bg-white" : "w-1.5 bg-white/45 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
