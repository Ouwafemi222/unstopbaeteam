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
    <div className="relative hidden lg:flex lg:w-1/2 flex-col overflow-hidden bg-neutral-900">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-green/80 via-brand-green-dark/70 to-brand-orange/60 z-10 pointer-events-none" />

      {/* Photo stage */}
      <div className="relative flex-1 flex items-center justify-center p-8 z-0">
        <div className="relative w-full max-w-xl aspect-[4/3]">
          <div
            key={index}
            className={`absolute inset-0 team-photo-frame ${
              phase === "enter"
                ? "team-photo-enter"
                : phase === "exit"
                  ? "team-photo-exit"
                  : "team-photo-heartbeat"
            }`}
          >
            <div className="relative h-full w-full overflow-hidden rounded-2xl shadow-2xl ring-4 ring-white/20">
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                className="object-cover object-center"
                priority={index === 0}
                sizes="(max-width: 1024px) 50vw, 600px"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Branding overlay */}
      <div className="relative z-20 p-10 pt-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
            <Laptop className="h-6 w-6 text-white" />
            <Smartphone className="h-3.5 w-3.5 -ml-1 text-white" />
          </div>
          <div>
            <p className="text-xl font-bold text-white leading-tight">UNSTOPPABLE</p>
            <p className="text-sm font-semibold text-brand-orange-light">TEAM</p>
          </div>
        </div>
        <p className="text-white/90 text-sm leading-relaxed max-w-sm">
          Your internal command center for managing Fiverr accounts, tracking messages, and monitoring team performance.
        </p>

        {/* Slide indicators */}
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
                i === index ? "w-8 bg-white" : "w-1.5 bg-white/40 hover:bg-white/60"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
