import { learnedStatusFromState, type FsrsState } from "@/domain/models";

const META: Record<
  ReturnType<typeof learnedStatusFromState>,
  { label: string; className: string }
> = {
  not_learned: { label: "Nowa", className: "bg-[var(--surface-2)] text-[var(--text-muted)]" },
  partial: { label: "W trakcie", className: "bg-amber-500/15 text-amber-400" },
  learned: { label: "Opanowana", className: "bg-emerald-500/15 text-emerald-400" },
};

export function StatusBadge({ state }: { state: FsrsState }) {
  const m = META[learnedStatusFromState(state)];
  return (
    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${m.className}`}>{m.label}</span>
  );
}
