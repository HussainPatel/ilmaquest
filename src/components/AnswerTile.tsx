"use client";

import { Triangle, Diamond, Circle, Square, Check, X } from "lucide-react";

// Kahoot/Blooket-style color-blocked answer tile, restyled with ilmaQuest's
// jewel-tone palette (globals.css --tile-1..4) instead of generic
// red/blue/yellow/green. Shape + color together (not color alone) so it
// still reads for color-blind players.
const TILE_STYLES = [
  { icon: Triangle, bg: "bg-tile-1", fg: "text-tile-1-foreground" },
  { icon: Diamond, bg: "bg-tile-2", fg: "text-tile-2-foreground" },
  { icon: Circle, bg: "bg-tile-3", fg: "text-tile-3-foreground" },
  { icon: Square, bg: "bg-tile-4", fg: "text-tile-4-foreground" },
];

export function AnswerTile({
  index,
  text,
  onClick,
  disabled,
  isChosen,
  isCorrect, // set once an answer has been revealed
  readOnly, // static display (e.g. host's preview) — never dims, never clickable
}: {
  index: number;
  text: string;
  onClick?: () => void;
  disabled?: boolean;
  isChosen?: boolean;
  isCorrect?: boolean | null;
  readOnly?: boolean;
}) {
  const style = TILE_STYLES[index % TILE_STYLES.length];
  const Icon = style.icon;
  const revealed = isCorrect !== null && isCorrect !== undefined;

  const content = (
    <>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/15">
        <Icon size={16} fill="currentColor" strokeWidth={1} />
      </span>
      <span className="flex-1">{text}</span>
      {revealed && isCorrect && <Check size={20} />}
      {revealed && !isCorrect && isChosen && <X size={20} />}
      {!revealed && isChosen && <Check size={20} />}
    </>
  );

  if (readOnly) {
    return (
      <div className={`flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-left text-base font-semibold shadow-md ${style.bg} ${style.fg}`}>
        {content}
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-left text-base font-semibold shadow-md transition-all ${style.bg} ${style.fg} ${
        disabled
          ? revealed && isCorrect
            ? "scale-[1.02] ring-4 ring-primary/60"
            : "opacity-40"
          : isChosen
            ? "scale-[1.02] ring-4 ring-foreground/40"
            : "hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
      }`}
    >
      {content}
    </button>
  );
}
