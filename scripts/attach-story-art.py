#!/usr/bin/env python3
"""Достаёт арты истории из кэша галерей Fandom и пишет в JSON персонажа."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHAR_DIR = ROOT / "research" / "characters"
CACHE = Path("/tmp/grok-goal-a057ac22dd42/implementer/media-cache")


def parse_md(raw: str) -> tuple[dict, str]:
    end = raw.find("\n---\n", 4)
    return json.loads(raw[4:end]), raw[end + 5 :]


def render_md(record: dict, body: str) -> str:
    return "---\n" + json.dumps(record, ensure_ascii=False, indent=2) + "\n---\n" + body


def norm(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def classify(filename: str) -> str | None:
    name = filename.lower()
    if "multi_wish" in name or "preview" in name or "icon" in name:
        return None
    if re.search(r"character_details_\d+", name):
        return "details"
    if "introduction_card" in name:
        return "intro-card"
    if "introduction_banner" in name:
        return "intro-banner"
    if name.endswith("_wish.png") or name.endswith("_wish.jpg"):
        return "wish"
    if "portrait" in name:
        return "portrait"
    if "namecard_background" in name:
        return "namecard"
    if "_vision." in name:
        return "vision"
    if name.startswith("idle_") and name.endswith(".gif"):
        return "idle"
    return None


def extract(html: str) -> list[dict]:
    urls = re.findall(
        r"https://static\.wikia\.nocookie\.net/gensin-impact/images/[^\"']+",
        html,
    )
    by_kind: dict[str, list[dict]] = {}
    seen: set[str] = set()
    for raw in urls:
        base = raw.split("/revision")[0]
        filename = base.rsplit("/", 1)[-1]
        kind = classify(filename)
        if not kind or base in seen:
            continue
        seen.add(base)
        url = base + "/revision/latest/scale-to-width-down/960"
        by_kind.setdefault(kind, []).append(
            {
                "id": f"{kind}-{len(by_kind.get(kind, []))}",
                "alt": filename.replace("_", " ").rsplit(".", 1)[0],
                "url": url,
            }
        )
    order = [
        "wish",
        "portrait",
        "intro-card",
        "intro-banner",
        "details",
        "namecard",
        "vision",
        "idle",
    ]
    result: list[dict] = []
    for kind in order:
        result.extend(by_kind.get(kind, []))
    return result


def main() -> None:
    attached = 0
    for path in sorted(CHAR_DIR.glob("*.md")):
        raw = path.read_text(encoding="utf-8")
        record, body = parse_md(raw)
        cache = CACHE / f"gallery-{norm(record['nameEn'])}.html"
        art: list[dict] = []
        if cache.exists():
            art = extract(cache.read_text(encoding="utf-8", errors="replace"))
        record["storyArt"] = art
        path.write_text(render_md(record, body), encoding="utf-8")
        if art:
            attached += 1
        print(path.stem, len(art))
    print("with_art", attached)


if __name__ == "__main__":
    main()
