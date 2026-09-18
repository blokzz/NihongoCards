import type { Store } from "@/data/store";

let _store: Store | null = null;

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function createStore(): Promise<Store> {
  if (isTauri()) {
    const { SqliteStore } = await import("@/data/sqliteStore");
    return new SqliteStore();
  }
  const { WebStore } = await import("@/data/webStore");
  return new WebStore();
}

export async function getStore(): Promise<Store> {
  if (_store) return _store;
  const store = await createStore();
  await store.init();
  _store = store;
  return store;
}

export type { Store } from "@/data/store";
