# Ikony

Wygeneruj komplet ikon z jednego PNG-a (min. 1024×1024) poleceniem:

```bash
npm run tauri icon ścieżka/do/logo.png
```

Utworzy `32x32.png`, `128x128.png`, `128x128@2x.png`, `icon.icns`, `icon.ico`
i warianty mobilne. Do czasu wygenerowania `tauri build` będzie zgłaszać brak ikon.
