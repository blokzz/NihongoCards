const ANALYZE_URL_KEY = "nihongo-cards:analyzeUrl";

export function getAnalyzeUrl(): string {
  return localStorage.getItem(ANALYZE_URL_KEY) ?? "";
}

export function setAnalyzeUrl(url: string): void {
  localStorage.setItem(ANALYZE_URL_KEY, url.trim());
}

export function isUsingMock(): boolean {
  return getAnalyzeUrl().length === 0;
}

export function getIngestUrl(): string {
  const a = getAnalyzeUrl();
  if (!a) return "";
  return a.replace(/\/analyze\/cards\/?$/, "/ingest");
}
