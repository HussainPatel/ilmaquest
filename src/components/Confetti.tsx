"use client";

import { useMemo } from "react";

const COLORS = ["var(--tile-1)", "var(--tile-2)", "var(--tile-3)", "var(--tile-4)", "var(--accent)"];

// Hand-rolled confetti burst (no library) — a fixed set of absolutely
// positioned divs animated with the confetti-fall keyframe in globals.css.
export function Confetti({ count = 60 }: { count?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 2.2 + Math.random() * 1.6,
        color: COLORS[i % COLORS.length],
        size: 6 + Math.random() * 6,
        rotate: Math.random() * 360,
      })),
    [count]
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.left}%`,
            top: "-5vh",
            width: p.size,
            height: p.size * 0.6,
            backgroundColor: p.color,
            transform: `rotate(${p.rotate}deg)`,
            animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s 1 forwards`,
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  );
}
