import { useEffect, useMemo, useState } from "react";
import { getStore } from "@/data";
import type { HeatmapDay, Progress } from "@/data/store";
import { levelForXp } from "@/lib/xp";
import { Card as Panel } from "@/components/ui";
import { Heatmap, HeatmapLegend } from "@/features/stats/Heatmap";
import { useAppStore } from "@/store/useAppStore";

function xpForLevel(lvl: number): number {
  return Math.ceil((lvl / 0.1) ** 2);
}

function summarize(days: HeatmapDay[]) {
  let total = 0;
  let active = 0;
  let longest = 0;
  let run = 0;
  for (const d of days) {
    total += d.count;
    if (d.count > 0) {
      active += 1;
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  }
  let current = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].count > 0) current += 1;
    else break;
  }
  return { total, active, longest, current };
}

function Tile({ value, label }: { value: string | number; label: string }) {
  return (
    <Panel className="flex flex-col gap-1">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-[var(--text-muted)]">{label}</div>
    </Panel>
  );
}

export function StatsView() {
  const storeProgress = useAppStore((s) => s.progress);
  const [progress, setProgress] = useState<Progress | null>(storeProgress);
  const [days, setDays] = useState<HeatmapDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const store = await getStore();
      const [p, h] = await Promise.all([store.getProgress(), store.getHeatmap(365)]);
      setProgress(p);
      setDays(h);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => summarize(days), [days]);

  const xp = progress?.xp ?? 0;
  const level = progress?.level ?? levelForXp(xp);
  const curBase = xpForLevel(level);
  const nextAt = xpForLevel(level + 1);
  const pctToNext = nextAt > curBase ? Math.min(100, ((xp - curBase) / (nextAt - curBase)) * 100) : 0;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Statystyki</h1>

      <Panel className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <div className="text-sm font-medium">Poziom {level}</div>
          <div className="text-sm text-[var(--text-muted)]">{xp} XP</div>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-all"
            style={{ width: `${pctToNext}%` }}
          />
        </div>
        <div className="text-xs text-[var(--text-muted)]">
          {Math.max(0, nextAt - xp)} XP do poziomu {level + 1}
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile value={stats.total} label="Powtórek łącznie" />
        <Tile value={stats.active} label="Aktywnych dni" />
        <Tile value={`${stats.current} 🔥`} label="Bieżąca seria" />
        <Tile value={stats.longest} label="Najdłuższa seria" />
      </div>

      <Panel className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Aktywność (rok)</div>
          <HeatmapLegend />
        </div>
        {loading ? (
          <div className="text-sm text-[var(--text-muted)]">Ładowanie…</div>
        ) : (
          <Heatmap days={days} />
        )}
      </Panel>
    </div>
  );
}
