import type { HeatmapDay } from "@/data/store";

function level(count: number): number {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  return 4;
}

function cellBg(lvl: number): string {
  if (lvl === 0) return "var(--surface-2)";
  const pct = [0, 28, 48, 72, 100][lvl];
  return `color-mix(in srgb, var(--accent) ${pct}%, var(--surface-2))`;
}

function mondayIndex(iso: string): number {
  return (new Date(iso).getDay() + 6) % 7;
}

const DAY_LABELS = ["Pon", "", "Śr", "", "Pt", "", "Nd"];

export function Heatmap({ days }: { days: HeatmapDay[] }) {
  if (days.length === 0) return null;

  const lead = mondayIndex(days[0].date);
  const cells: (HeatmapDay | null)[] = [...Array(lead).fill(null), ...days];

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("pl-PL", { day: "numeric", month: "short" });

  return (
    <div className="flex gap-2">
      <div
        className="grid shrink-0 text-[10px] text-[var(--text-muted)]"
        style={{ gridTemplateRows: "repeat(7, 12px)", gap: 3 }}
      >
        {DAY_LABELS.map((d, i) => (
          <div key={i} className="flex items-center">
            {d}
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <div
          className="grid"
          style={{
            gridAutoFlow: "column",
            gridTemplateRows: "repeat(7, 12px)",
            gridAutoColumns: "12px",
            gap: 3,
          }}
        >
          {cells.map((c, i) =>
            c === null ? (
              <div key={`b${i}`} />
            ) : (
              <div
                key={c.date}
                title={`${fmt(c.date)}: ${c.count} ${c.count === 1 ? "powtórka" : "powtórek"}`}
                className="rounded-sm"
                style={{ background: cellBg(level(c.count)) }}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}

export function HeatmapLegend() {
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
      <span>Mniej</span>
      {[0, 1, 2, 3, 4].map((l) => (
        <span
          key={l}
          className="h-3 w-3 rounded-sm"
          style={{ background: cellBg(l) }}
        />
      ))}
      <span>Więcej</span>
    </div>
  );
}
