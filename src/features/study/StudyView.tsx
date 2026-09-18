import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { getStore } from "@/data";
import type { Card, Rating } from "@/domain/models";
import { gradeCard, previewIntervals } from "@/domain/srs";
import { XP_PER_REVIEW } from "@/lib/xp";
import { Button, Card as Panel } from "@/components/ui";
import { useAppStore } from "@/store/useAppStore";

const RATINGS: { rating: Rating; label: string; className: string; key: string }[] = [
  { rating: 1, label: "Znowu", className: "bg-red-600/90 hover:bg-red-600 text-white", key: "1" },
  { rating: 2, label: "Trudne", className: "bg-orange-500/90 hover:bg-orange-500 text-white", key: "2" },
  { rating: 3, label: "Dobre", className: "bg-emerald-600/90 hover:bg-emerald-600 text-white", key: "3" },
  { rating: 4, label: "Łatwe", className: "bg-sky-600/90 hover:bg-sky-600 text-white", key: "4" },
];

type Phase = "loading" | "empty" | "studying" | "done";

export function StudyView({ deckId }: { deckId: number }) {
  const navigate = useAppStore((s) => s.navigate);
  const addXp = useAppStore((s) => s.addXp);

  const [phase, setPhase] = useState<Phase>("loading");
  const [queue, setQueue] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [stats, setStats] = useState({ reviewed: 0, correct: 0, xp: 0 });

  const start = useCallback(
    async (mode: "due" | "all") => {
      const store = await getStore();
      const cards =
        mode === "due" ? await store.getDueCards(deckId, 50) : await store.getCards(deckId);
      setQueue(cards);
      setIndex(0);
      setRevealed(false);
      setStats({ reviewed: 0, correct: 0, xp: 0 });
      setPhase(cards.length ? "studying" : "empty");
    },
    [deckId]
  );

  useEffect(() => {
    void start("due");
  }, [start]);

  const current = queue[index];
  const intervals = useMemo(
    () => (current ? previewIntervals(current) : null),
    [current]
  );

  const answer = useCallback(
    async (rating: Rating) => {
      if (!current) return;
      const store = await getStore();
      const { snapshot, log, correct } = gradeCard(current, rating);
      await store.saveReview(current.id, snapshot, log, correct);
      const gained = correct ? XP_PER_REVIEW.correct : XP_PER_REVIEW.again;
      await addXp(gained);

      setStats((s) => ({
        reviewed: s.reviewed + 1,
        correct: s.correct + (correct ? 1 : 0),
        xp: s.xp + gained,
      }));

      if (index + 1 >= queue.length) setPhase("done");
      else {
        setIndex((i) => i + 1);
        setRevealed(false);
      }
    },
    [current, index, queue.length, addXp]
  );

  useEffect(() => {
    if (phase !== "studying") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!revealed) setRevealed(true);
      } else if (revealed && ["1", "2", "3", "4"].includes(e.key)) {
        void answer(Number(e.key) as Rating);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, revealed, answer]);

  const back = () => navigate({ view: "deckDetail", deckId });

  if (phase === "loading") return <div className="p-8 text-[var(--text-muted)]">Ładowanie…</div>;

  if (phase === "empty") {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 p-8 text-center">
        <div className="text-5xl">🎉</div>
        <h2 className="text-xl font-semibold">Brak kart na dziś</h2>
        <p className="text-[var(--text-muted)]">Wszystko powtórzone. Możesz też przejrzeć całą talię.</p>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={back}>
            ← Powrót
          </Button>
          <Button variant="accent" onClick={() => start("all")}>
            Ucz się mimo to
          </Button>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    const acc = stats.reviewed ? Math.round((stats.correct / stats.reviewed) * 100) : 0;
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 p-8 text-center">
        <div className="text-5xl">✅</div>
        <h2 className="text-xl font-semibold">Sesja ukończona</h2>
        <div className="flex gap-6 text-sm">
          <div>
            <div className="text-2xl font-semibold">{stats.reviewed}</div>
            <div className="text-[var(--text-muted)]">powtórzone</div>
          </div>
          <div>
            <div className="text-2xl font-semibold">{acc}%</div>
            <div className="text-[var(--text-muted)]">skuteczność</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-[var(--accent)]">+{stats.xp}</div>
            <div className="text-[var(--text-muted)]">XP</div>
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="ghost" onClick={back}>
            ← Powrót
          </Button>
          <Button variant="accent" onClick={() => start("due")}>
            Jeszcze raz
          </Button>
        </div>
      </div>
    );
  }

  const progress = queue.length ? (index / queue.length) * 100 : 0;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={back}>
          ← Przerwij
        </Button>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface-2)]">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-sm text-[var(--text-muted)]">
          {index + 1} / {queue.length}
        </span>
      </div>

      <motion.div
        key={current!.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
      >
        <Panel className="flex min-h-[280px] flex-col items-center justify-center gap-4 py-8 text-center">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <span>{current!.cardType}</span>
            {current!.jlpt && (
              <span className="rounded bg-[var(--surface-2)] px-1.5 py-0.5">{current!.jlpt}</span>
            )}
          </div>

          <div className="text-5xl font-semibold">{current!.front}</div>

          {revealed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex w-full flex-col items-center gap-3 border-t border-[var(--border)] pt-4"
            >
              {(current!.furigana || current!.reading) && (
                <div className="text-[var(--text-muted)]">
                  {current!.furigana || current!.reading}
                </div>
              )}
              {current!.cardType === "kanji" && (current!.onyomi || current!.kunyomi) && (
                <div className="text-sm text-[var(--text-muted)]">
                  {current!.onyomi && <>音: {current!.onyomi} </>}
                  {current!.kunyomi && <>訓: {current!.kunyomi}</>}
                </div>
              )}
              {current!.back && <div className="text-2xl">{current!.back}</div>}
              {current!.meanings.length > 0 && (
                <div className="text-lg">{current!.meanings.join(", ")}</div>
              )}
              {current!.synonyms.length > 0 && (
                <div className="text-sm text-[var(--text-muted)]">
                  Synonimy: {current!.synonyms.join(", ")}
                </div>
              )}
              {current!.register && (
                <div className="rounded-md bg-[var(--surface-2)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
                  {current!.register}
                </div>
              )}
              {current!.usageNote && (
                <div className="max-w-md text-sm text-[var(--text-muted)]">💡 {current!.usageNote}</div>
              )}
              {current!.examples.length > 0 && (
                <div className="mt-2 flex w-full flex-col gap-2 text-left">
                  {current!.examples.map((ex, i) => (
                    <div key={i} className="rounded-lg bg-[var(--surface-2)] px-3 py-2 text-sm">
                      <div>{ex.text}</div>
                      {ex.reading && <div className="text-xs text-[var(--text-muted)]">{ex.reading}</div>}
                      {ex.translation && (
                        <div className="text-xs text-[var(--text-muted)]">{ex.translation}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </Panel>
      </motion.div>

      {!revealed ? (
        <Button variant="accent" className="py-3" onClick={() => setRevealed(true)}>
          Pokaż odpowiedź <span className="ml-1 opacity-60">(spacja)</span>
        </Button>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {RATINGS.map((r) => (
            <button
              key={r.rating}
              onClick={() => answer(r.rating)}
              className={`flex flex-col items-center gap-0.5 rounded-lg px-2 py-3 text-sm font-medium transition ${r.className}`}
            >
              <span>{r.label}</span>
              <span className="text-xs opacity-80">{intervals?.[r.rating]}</span>
              <span className="text-[10px] opacity-60">[{r.key}]</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
