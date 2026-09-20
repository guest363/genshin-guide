#!/usr/bin/env python3
"""Дописывает шаги истории из русской вики Fandom (страница «Лор»)."""

from __future__ import annotations

import json
import re
import subprocess
import time
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHAR_DIR = ROOT / "research" / "characters"

TEMPLATE_RE = re.compile(r"\{\{[^{}]*\}\}", re.S)
LINK_RE = re.compile(r"\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]")
REF_RE = re.compile(r"<ref[^>]*>.*?</ref>", re.S | re.I)
TAG_RE = re.compile(r"<[^>]+>")
QUOTE_HEAD_RE = re.compile(r"^['\"]+|['\"]+$")
BOLD_RE = re.compile(r"'{2,}")


def strip_wiki(text: str) -> str:
    text = text.replace("{{sic|", "")
    for _ in range(8):
        nxt = TEMPLATE_RE.sub("", text)
        if nxt == text:
            break
        text = nxt
    text = REF_RE.sub("", text)
    text = LINK_RE.sub(lambda match: match.group(2) or match.group(1), text)
    text = TAG_RE.sub("", text)
    text = BOLD_RE.sub("", text)
    text = re.sub(r"https?://\S+", "", text)
    text = text.replace("&mdash;", "—").replace("&nbsp;", " ").replace("{{sic", "")
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def section_map(wikitext: str) -> dict[str, str]:
    parts = re.split(r"\n==+\s*(.+?)\s*==+\n", wikitext)
    result: dict[str, str] = {}
    intro = parts[0] if parts else ""
    if intro.strip():
        result["_intro"] = intro
    for index in range(1, len(parts) - 1, 2):
        result[parts[index].strip()] = parts[index + 1]
    return result


def first_paragraphs(text: str, limit: int = 3) -> str:
    text = re.sub(r"^=+\s*[^=\n]+?\s*=+\s*", "", text, flags=re.M)
    chunks = [chunk.strip() for chunk in re.split(r"\n\s*\n", strip_wiki(text)) if chunk.strip()]
    keep = []
    for chunk in chunks:
        chunk = re.sub(r"^=+\s*[^=]+?\s*=+\s*", "", chunk).strip()
        if chunk.startswith("*") or chunk.startswith("#") or chunk.startswith("—"):
            continue
        if chunk.startswith("http"):
            continue
        if chunk.startswith("="):
            continue
        if len(chunk) < 40:
            continue
        keep.append(re.sub(r"\s+", " ", chunk))
        if len(keep) >= limit:
            break
    return " ".join(keep)


def fetch_lore(title: str) -> str | None:
    page = f"{title}/Лор"
    url = (
        "https://genshin-impact.fandom.com/ru/api.php?action=parse&page="
        + urllib.parse.quote(page)
        + "&prop=wikitext&format=json"
    )
    result = subprocess.run(
        ["curl", "-sS", "-A", "Mozilla/5.0 GenshinVitrineResearch/1.0", "-m", "25", url],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0 or not result.stdout:
        return None
    try:
        payload = json.loads(result.stdout)
    except json.JSONDecodeError:
        return None
    if "error" in payload:
        return None
    return payload["parse"]["wikitext"]["*"]


def parse_frontmatter(raw: str) -> tuple[dict, str]:
    if not raw.startswith("---\n"):
        raise ValueError("no frontmatter")
    end = raw.find("\n---\n", 4)
    if end < 0:
        raise ValueError("no frontmatter end")
    data = json.loads(raw[4:end])
    body = raw[end + 5 :]
    return data, body


def rewrite_history(body: str, steps: list[dict]) -> str:
    story = "\n\n".join(
        f"### {index}. {step['title']}\n\n{step['body']}" for index, step in enumerate(steps, 1)
    )
    pattern = re.compile(r"## История\n\n.*?\n\n## Таланты и созвездия", re.S)
    replacement = f"## История\n\n{story}\n\n## Таланты и созвездия"
    if not pattern.search(body):
        return body
    return pattern.sub(replacement, body, count=1)


def titles_for(record: dict) -> list[str]:
    names = [record["shortName"], record["name"], record["nameEn"]]
    aliases = {
        "Путешественник": ["Путешественник"],
        "Манекен": ["Манекен", "Манекены Чудесного края"],
        "Райдэн сёгун": ["Райдэн", "Сёгун Райдэн"],
        "Аратаки Итто": ["Итто", "Аратаки Итто"],
        "Камисато Аяка": ["Аяка"],
        "Камисато Аято": ["Аято"],
        "Сангономия Кокоми": ["Кокоми"],
        "Каэдэхара Кадзуха": ["Кадзуха"],
        "Юмэмидзуки Мидзуки": ["Мидзуки"],
        "Сиканоин Хэйдзо": ["Хэйдзо"],
        "Куки Синобу": ["Синобу"],
        "Кудзё Сара": ["Сара"],
    }
    extra = aliases.get(record["name"], [])
    seen: list[str] = []
    for name in extra + names:
        if name and name not in seen:
            seen.append(name)
    return seen


def enrich_record(record: dict, wikitext: str, lore_title: str) -> dict:
    sections = section_map(wikitext)
    official = first_paragraphs(
        sections.get("Описание на официальном сайте")
        or sections.get("Описание")
        or "",
        2,
    )
    intro = first_paragraphs(sections.get("Представление персонажа") or "", 3)
    personality = first_paragraphs(sections.get("Личность") or "", 2)
    look = first_paragraphs(sections.get("Внешность") or "", 2)

    extra: list[dict] = []
    if official:
        extra.append(
            {
                "id": "official-site",
                "title": "Как персонажа представляет официальный сайт",
                "body": official,
            }
        )
    if intro:
        extra.append(
            {
                "id": "introduction",
                "title": "Представление персонажа",
                "body": intro,
            }
        )
    if personality:
        extra.append(
            {
                "id": "personality",
                "title": "Характер",
                "body": personality,
            }
        )
    if look:
        extra.append(
            {
                "id": "appearance",
                "title": "Внешность",
                "body": look,
            }
        )

    existing_ids = {step["id"] for step in record["storySteps"]}
    merged = list(record["storySteps"])
    for step in extra:
        if step["id"] in existing_ids:
            for index, current in enumerate(merged):
                if current["id"] == step["id"]:
                    merged[index] = step
                    break
        else:
            merged.append(step)
    record["storySteps"] = merged
    lore_url = f"https://genshin-impact.fandom.com/ru/wiki/{urllib.parse.quote(lore_title + '/Лор')}"
    if not any(item["url"] == lore_url for item in record["sources"]):
        record["sources"].append(
            {
                "title": f"Genshin Impact Вики — {lore_title}/Лор",
                "url": lore_url,
            }
        )
    return record


def main() -> None:
    ok = 0
    missing: list[str] = []
    for path in sorted(CHAR_DIR.glob("*.md")):
        raw = path.read_text(encoding="utf-8")
        record, body = parse_frontmatter(raw)
        wikitext = None
        used = None
        for title in titles_for(record):
            wikitext = fetch_lore(title)
            if wikitext:
                used = title
                break
            time.sleep(0.05)
        if not wikitext:
            missing.append(record["nameEn"])
            print("MISS", record["nameEn"], titles_for(record)[:3])
            continue
        record = enrich_record(record, wikitext, used or record["shortName"])
        new_body = rewrite_history(body, record["storySteps"])
        path.write_text("---\n" + json.dumps(record, ensure_ascii=False, indent=2) + "\n---\n" + new_body, encoding="utf-8")
        ok += 1
        print("OK", record["nameEn"], used, "storySteps", len(record["storySteps"]))
        time.sleep(0.08)
    print("enriched", ok, "missing", len(missing))
    print("\n".join(missing))


if __name__ == "__main__":
    main()
