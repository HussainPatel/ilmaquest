const TILE_BG = ["bg-tile-1", "bg-tile-2", "bg-tile-3", "bg-tile-4"];
const TILE_FG = [
  "text-tile-1-foreground",
  "text-tile-2-foreground",
  "text-tile-3-foreground",
  "text-tile-4-foreground",
];

function colorIndexFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return hash % TILE_BG.length;
}

export function PlayerAvatar({ name, size = 32 }: { name: string; size?: number }) {
  const idx = colorIndexFor(name || "?");
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold ${TILE_BG[idx]} ${TILE_FG[idx]}`}
    >
      {initial}
    </span>
  );
}
