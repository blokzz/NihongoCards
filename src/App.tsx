import { useEffect } from "react";
import { useAppStore, type View } from "@/store/useAppStore";
import { levelForXp } from "@/lib/xp";
import { DecksView } from "@/features/decks/DecksView";
import { DeckDetailView } from "@/features/decks/DeckDetailView";
import { StudyView } from "@/features/study/StudyView";
import { StatsView } from "@/features/stats/StatsView";
import { SettingsView } from "@/features/settings/SettingsView";

const NAV: { view: View; label: string; icon: string }[] = [
  { view: "decks", label: "Talie", icon: "🎴" },
  { view: "stats", label: "Statystyki", icon: "📊" },
  { view: "settings", label: "Ustawienia", icon: "⚙️" },
];

function Sidebar() {
  const route = useAppStore((s) => s.route);
  const navigate = useAppStore((s) => s.navigate);
  const progress = useAppStore((s) => s.progress);

  const activeGroup =
    route.view === "deckDetail" || route.view === "study" ? "decks" : route.view;

  return (
    <aside className="flex w-56 shrink-0 flex-col gap-1 border-r border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="px-2 py-3 text-lg font-semibold">日本語暗記</div>
      {NAV.map((n) => (
        <button
          key={n.view}
          onClick={() => navigate({ view: n.view })}
          className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
            activeGroup === n.view
              ? "bg-[var(--accent)] text-[var(--on-accent)]"
              : "text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
          }`}
        >
          <span>{n.icon}</span>
          {n.label}
        </button>
      ))}
      <div className="mt-auto rounded-lg bg-[var(--surface-2)] px-3 py-2.5 text-sm">
        <div className="text-[var(--text-muted)]">Poziom {progress?.level ?? levelForXp(0)}</div>
        <div className="font-medium">{progress?.xp ?? 0} XP</div>
      </div>
    </aside>
  );
}

function Content() {
  const route = useAppStore((s) => s.route);
  switch (route.view) {
    case "decks":
      return <DecksView />;
    case "deckDetail":
      return <DeckDetailView deckId={route.deckId!} />;
    case "study":
      return <StudyView deckId={route.deckId!} />;
    case "stats":
      return <StatsView />;
    case "settings":
      return <SettingsView />;
  }
}

export default function App() {
  const bootstrap = useAppStore((s) => s.bootstrap);
  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Content />
      </main>
    </div>
  );
}
