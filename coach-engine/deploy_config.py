import os
from pathlib import Path
from typing import List

BASE_DIR = Path(__file__).resolve().parent
WINDOWS_STOCKFISH = BASE_DIR / "engine" / "stockfish-windows-x86-64-avx2.exe"
LINUX_STOCKFISH_CANDIDATES = [
    Path("/usr/games/stockfish"),
    Path("/usr/bin/stockfish"),
]


def resolve_stockfish_path() -> str:
    env_path = os.getenv("STOCKFISH_PATH", "").strip()
    if env_path:
        return env_path

    if WINDOWS_STOCKFISH.exists():
        return str(WINDOWS_STOCKFISH)

    for candidate in LINUX_STOCKFISH_CANDIDATES:
        if candidate.exists():
            return str(candidate)

    return str(WINDOWS_STOCKFISH)


def get_cors_allowed_origins() -> List[str]:
    defaults = [
        "http://localhost:10000",
        "http://127.0.0.1:10000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://chessbet.pages.dev",
        "https://chessbett.pages.dev",
    ]
    configured = [
        origin.strip()
        for origin in os.getenv("CORS_ALLOWED_ORIGINS", "").split(",")
        if origin.strip()
    ]

    ordered: List[str] = []
    seen = set()
    for origin in defaults + configured:
        if origin not in seen:
            ordered.append(origin)
            seen.add(origin)

    return ordered
