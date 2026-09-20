#!/usr/bin/env python3
"""Дозаписывает демо боевых талантов (mp4 + постер первого кадра).

Боевым талантам без своего превью (previewGif/previewVideo) проставляет
локальные демо из public/media/{slug}/demo-{attack|skill|burst}.mp4 —
те же файлы, что использует витрина-образец (site) в media.ts.
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHAR_DIR = ROOT / "research" / "characters"
MEDIA = ROOT / "public" / "media"

# Слаги данных, чьи демо в образце лежат под другим именем.
SLUG_ALIAS = {
    "kaedehara-kazuha": "kazuha",
    "kamisato-ayaka": "ayaka",
    "kamisato-ayato": "ayato",
    "kujou-sara": "sara",
    "raiden-shogun": "raiden",
    "sangonomiya-kokomi": "kokomi",
    "puteshestvennik": "traveler",
}

KIND_DEMO = {
    "Обычная атака": "attack",
    "Элементальный навык": "skill",
    "Взрыв стихии": "burst",
}


def parse_md(raw: str) -> tuple[dict, str]:
    end = raw.find("\n---\n", 4)
    return json.loads(raw[4:end]), raw[end + 5 :]


def render_md(record: dict, body: str) -> str:
    return "---\n" + json.dumps(record, ensure_ascii=False, indent=2) + "\n---\n" + body


def is_constellation(step: dict) -> bool:
    return step.get("id", "").startswith("constellation-") or step.get("title", "").startswith("Созвездие")


def main() -> None:
    filled_steps = 0
    filled_chars = 0
    skipped_no_media: list[str] = []

    for path in sorted(CHAR_DIR.glob("*.md")):
        record, body = parse_md(path.read_text(encoding="utf-8"))
        slug = record["slug"]
        media_slug = SLUG_ALIAS.get(slug, slug)
        changed = False

        for step in record.get("talentSteps", []):
            if is_constellation(step) or step.get("previewGif") or step.get("previewVideo"):
                continue
            kind = step.get("title", "").split(": ")[0]
            demo = KIND_DEMO.get(kind)
            if not demo:
                continue
            video = MEDIA / media_slug / f"demo-{demo}.mp4"
            poster = MEDIA / media_slug / f"demo-{demo}.webp"
            if not video.exists():
                if slug not in skipped_no_media:
                    skipped_no_media.append(slug)
                continue
            step["previewVideo"] = f"/media/{media_slug}/demo-{demo}.mp4"
            if poster.exists():
                step["previewPoster"] = f"/media/{media_slug}/demo-{demo}.webp"
            filled_steps += 1
            changed = True

        if changed:
            path.write_text(render_md(record, body), encoding="utf-8")
            filled_chars += 1

    print(f"Заполнено шагов: {filled_steps} у {filled_chars} персонажей")
    if skipped_no_media:
        print("Без демо-файлов (пропущены):", ", ".join(skipped_no_media))


if __name__ == "__main__":
    main()
