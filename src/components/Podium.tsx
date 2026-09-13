import { Trophy } from "lucide-react";
import { PlayerAvatar } from "./PlayerAvatar";

type Player = { id: string; name: string; score: number };

const PEDESTAL = [
  { order: 2, height: "h-20", tile: "bg-tile-2", label: "2nd" },
  { order: 1, height: "h-28", tile: "bg-tile-3", label: "1st" },
  { order: 3, height: "h-14", tile: "bg-tile-4", label: "3rd" },
];

export function Podium({ players }: { players: Player[] }) {
  const top3 = players.slice(0, 3);
  const rest = players.slice(3);

  return (
    <div>
      <div className="flex items-end justify-center gap-3">
        {PEDESTAL.map(({ order, height, tile, label }) => {
          const player = top3[order - 1];
          if (!player) return <div key={order} className="w-24" />;
          return (
            <div key={order} className="flex w-24 flex-col items-center">
              {order === 1 && <Trophy className="mb-1 text-accent" size={22} />}
              <PlayerAvatar name={player.name} size={40} />
              <p className="mt-1.5 max-w-full truncate text-sm font-semibold">{player.name}</p>
              <p className="text-xs text-muted-foreground">{player.score} pts</p>
              <div
                className={`mt-2 flex w-full items-start justify-center rounded-t-lg pt-1 text-xs font-bold text-white ${height} ${tile}`}
              >
                {label}
              </div>
            </div>
          );
        })}
      </div>

      {rest.length > 0 && (
        <ol className="mx-auto mt-6 flex max-w-sm flex-col gap-1.5">
          {rest.map((p, i) => (
            <li
              key={p.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm"
            >
              <span className="w-5 text-xs text-muted-foreground">{i + 4}</span>
              <PlayerAvatar name={p.name} size={22} />
              <span className="flex-1 truncate">{p.name}</span>
              <span className="font-medium">{p.score}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
