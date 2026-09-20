#!/usr/bin/env python3
"""Подставляет официальные Character Demo / Trailer с YouTube."""

from __future__ import annotations

import json
import re
import subprocess
import time
import urllib.parse
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHAR_DIR = ROOT / "research" / "characters"
CACHE = Path("/tmp/grok-goal-a057ac22dd42/implementer/media-cache")
CACHE.mkdir(parents=True, exist_ok=True)
OFFICIAL = "UCiS882YPwZt1NfaM0gR0D9Q"


def parse_md(raw: str) -> tuple[dict, str]:
    end = raw.find("\n---\n", 4)
    return json.loads(raw[4:end]), raw[end + 5 :]


def render_md(record: dict, body: str) -> str:
    return "---\n" + json.dumps(record, ensure_ascii=False, indent=2) + "\n---\n" + body


def curl(url: str) -> str:
    result = subprocess.run(
        ["curl", "-sS", "-A", "Mozilla/5.0", "-L", "-m", "25", url],
        capture_output=True,
        text=True,
    )
    return result.stdout


def search_official(name_en: str) -> dict | None:
    query = f"Character Demo {name_en} Genshin Impact"
    cache = CACHE / f"yt-{re.sub(r'[^a-z0-9]+', '', name_en.lower())}.html"
    if cache.exists() and cache.stat().st_size > 1000:
        html = cache.read_text(encoding="utf-8", errors="replace")
    else:
        url = "https://www.youtube.com/results?" + urllib.parse.urlencode(
            {"search_query": query}
        )
        html = curl(url)
        cache.write_text(html, encoding="utf-8")
    blocks = re.findall(
        r'videoRenderer":\{"videoId":"([\w-]{11})"(.*?)"ownerText"',
        html,
        re.S,
    )
    needle = name_en.lower()
    last = name_en.split()[-1].lower()
    best: dict | None = None
    for video_id, rest in blocks:
        if OFFICIAL not in rest:
            continue
        blob = rest.lower()
        if "extract" in blob or "miscellany" in blob or "outfit teaser" in blob:
            continue
        if needle not in blob and last not in blob:
            continue
        title = f"Character Demo — {name_en}"
        if "character trailer" in blob:
            title = f"Character Trailer — {name_en}"
        candidate = {"title": title, "youtubeId": video_id}
        if "character demo" in blob or "character trailer" in blob:
            return candidate
        if best is None:
            best = candidate
    return best


def main() -> None:
    counts: Counter[str] = Counter()
    records: list[tuple[Path, dict, str]] = []
    for path in sorted(CHAR_DIR.glob("*.md")):
        raw = path.read_text(encoding="utf-8")
        record, body = parse_md(raw)
        for video in record.get("videos") or []:
            counts[video["youtubeId"]] += 1
        records.append((path, record, body))

    shared = {video_id for video_id, count in counts.items() if count > 2}
    filled = 0
    for path, record, body in records:
        found = search_official(record["nameEn"])
        time.sleep(0.12)
        current = [
            video
            for video in record.get("videos") or []
            if video["youtubeId"] not in shared
        ]
        if found:
            videos = [found]
            filled += 1
            print("YT", record["nameEn"], found["youtubeId"], found["title"][:70])
        elif current:
            videos = current
            print("KEEP", record["nameEn"], current[0]["youtubeId"])
        else:
            videos = []
            print("MISS", record["nameEn"])
        record["videos"] = videos
        path.write_text(render_md(record, body), encoding="utf-8")
    print("filled", filled)


if __name__ == "__main__":
    main()
