import { useState } from "react";
import { ACCENTS, type ThemeName } from "@/lib/theme";
import { Button, Card as Panel, TextField } from "@/components/ui";
import { getAnalyzeUrl, setAnalyzeUrl } from "@/lib/config";
import { useAppStore } from "@/store/useAppStore";

const THEME_LABELS: Record<ThemeName, string> = {
  red: "Czerwony",
  green: "Zielony",
  blue: "Niebieski",
  yellow: "Żółty",
};

export function SettingsView() {
  const progress = useAppStore((s) => s.progress);
  const setTheme = useAppStore((s) => s.setTheme);
  const active = progress?.theme ?? "red";

  const [url, setUrl] = useState(getAnalyzeUrl());
  const [saved, setSaved] = useState(false);

  const saveUrl = () => {
    setAnalyzeUrl(url);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Ustawienia</h1>

      <Panel className="flex flex-col gap-3">
        <div className="text-sm font-medium">Kolor motywu</div>
        <div className="text-xs text-[var(--text-muted)]">
          Zmienia się tylko akcent — baza pozostaje ciemna.
        </div>
        <div className="flex gap-3 pt-1">
          {(Object.keys(ACCENTS) as ThemeName[]).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`flex flex-col items-center gap-2 rounded-xl border p-3 transition ${
                active === t
                  ? "border-[var(--accent)]"
                  : "border-[var(--border)] hover:border-[var(--text-muted)]"
              }`}
            >
              <span
                className="h-8 w-8 rounded-full"
                style={{ background: ACCENTS[t].accent }}
              />
              <span className="text-xs">{THEME_LABELS[t]}</span>
            </button>
          ))}
        </div>
      </Panel>

      <Panel className="flex flex-col gap-3">
        <div className="text-sm font-medium">Backend analizy AI (JapaneseRag)</div>
        <div className="text-xs text-[var(--text-muted)]">
          URL endpointu <code>/analyze/word</code>. Pozostaw puste, aby użyć trybu demo (mock).
        </div>
        <div className="flex items-center gap-2">
          <TextField
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="http://localhost:8000/analyze/word"
          />
          <Button variant="accent" onClick={saveUrl}>
            {saved ? "Zapisano ✓" : "Zapisz"}
          </Button>
        </div>
      </Panel>
    </div>
  );
}
