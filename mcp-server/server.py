import json
import os
import sqlite3
from pathlib import Path

DB_PATH = Path(os.environ.get("NIHONGO_DB_PATH", "nihongo.db"))


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


if __name__ == "__main__":
    print("Szkielet serwera MCP. Zainstaluj `mcp`, odkomentuj kod i ustaw NIHONGO_DB_PATH.")
