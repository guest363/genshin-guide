#!/usr/bin/env python3
"""Прикрепляет превью талантов с Fandom и официальные трейлеры YouTube."""

from __future__ import annotations

import json
import re
import subprocess
import time
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHAR_DIR = ROOT / "research" / "characters"
CACHE = Path("/tmp/grok-goal-a057ac22dd42/implementer/media-cache")
CACHE.mkdir(parents=True, exist_ok=True)

YATTA_UA = "Mozilla/5.0 GenshinVitrineResearch/1.0"


def curl(url: str, dest: Path | None = None, timeout: int = 30) -> str:
    args = ["curl", "-sS", "-A", YATTA_UA, "-m", str(timeout), url]
    if dest:
        args.extend(["-o", str(dest)])
        subprocess.run(args, check=False)
        return dest.read_text(encoding="utf-8") if dest.exists() else ""
    result = subprocess.run(args, capture_output=True, text=True)
    return result.stdout


def parse_md(raw: str) -> tuple[dict, str]:
    end = raw.find("\n---\n", 4)
    return json.loads(raw[4:end]), raw[end + 5 :]


def render_md(record: dict, body: str) -> str:
    return "---\n" + json.dumps(record, ensure_ascii=False, indent=2) + "\n---\n" + body


def norm(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def fetch_trailer_map() -> dict[str, list[dict]]:
    cache = CACHE / "trailers.html.json"
    if cache.exists():
        html = json.loads(cache.read_text())["html"]
    else:
        payload = json.loads(
            curl(
                "https://genshin-impact.fandom.com/api.php?action=parse&page=Character_Trailer&prop=text&format=json"
            )
        )
        html = payload["parse"]["text"]["*"]
        cache.write_text(json.dumps({"html": html}), encoding="utf-8")

    mapped: dict[str, list[dict]] = {}
    for row in re.findall(r"<tr>(.*?)</tr>", html, re.S):
        youtube = re.search(
            r"(?:youtube\.com/embed/|youtu\.be/|youtube\.com/watch\?v=)([\w-]{11})",
            row,
        )
        if not youtube:
            continue
        title_match = re.search(
            r"Character (?:Demo|Trailer) - &quot;([^&]+)",
            row,
        ) or re.search(r"(Cryo Chapter|Pyro Chapter)[^<]{0,80}", row)
        title = title_match.group(0)
        title = title.replace("&quot;", '"').replace("&#44;", ",")
        links = re.findall(r'href="/wiki/([^"]+)"', row)
        names = [
            urllib.parse.unquote(link).replace("_", " ")
            for link in links
            if not link.startswith("File:")
        ]
        video = {"title": re.sub(r"<[^>]+>", "", title)[:120], "youtubeId": youtube.group(1)}
        for name in names:
            mapped.setdefault(name, [])
            if all(item["youtubeId"] != video["youtubeId"] for item in mapped[name]):
                mapped[name].append(video)
    return mapped


def gallery_html(name_en: str) -> str:
    page = name_en.replace(" ", "_") + "/Gallery"
    cache = CACHE / f"gallery-{norm(name_en)}.html"
    if cache.exists() and cache.stat().st_size > 500:
        return cache.read_text(encoding="utf-8")
    encoded = urllib.parse.quote(page)
    payload = curl(
        f"https://genshin-impact.fandom.com/api.php?action=parse&page={encoded}&prop=text&format=json"
    )
    try:
        html = json.loads(payload)["parse"]["text"]["*"]
    except (KeyError, json.JSONDecodeError):
        html = ""
    cache.write_text(html, encoding="utf-8")
    return html


def extract_previews(html: str) -> list[str]:
    found = re.findall(
        r"https://static\.wikia\.nocookie\.net/gensin-impact/images/[^\"']+Preview\.(?:gif|mp4)[^\"']*",
        html,
    )
    clean: list[str] = []
    seen: set[str] = set()
    for url in found:
        base = url.split("/revision")[0]
        if base in seen:
            continue
        seen.add(base)
        clean.append(base)
    return clean


def yatta_en(avatar_id: str) -> dict | None:
    key = avatar_id.split("-")[0]
    cache = CACHE / f"en-{key}.json"
    if cache.exists() and cache.stat().st_size > 200:
        try:
            return json.loads(cache.read_text())["data"]
        except (KeyError, json.JSONDecodeError):
            return None
    payload = curl(f"https://gi.yatta.moe/api/v2/en/avatar/{key}")
    if not payload:
        return None
    cache.write_text(payload, encoding="utf-8")
    try:
        return json.loads(payload)["data"]
    except json.JSONDecodeError:
        return None


def pick_preview(previews: list[str], talent_name: str, kind: str) -> tuple[str | None, str | None]:
    target = norm(talent_name.replace(":", " "))
    scored: list[tuple[int, str]] = []
    for url in previews:
        stem = Path(urllib.parse.urlparse(url).path).stem.lower()
        key = norm(stem.replace("preview", ""))
        if target not in key and key not in target:
            continue
        score = 10
        if kind == "attack" and "normal" in key:
            score += 5
        if kind != "attack" and "normal" in key:
            score -= 4
        if "charged" in key or "plunging" in key:
            score -= 3
        if url.endswith(".gif"):
            score += 2
        scored.append((score, url))
    scored.sort(reverse=True)
    gif = next((url for _, url in scored if url.endswith(".gif")), None)
    video = next((url for _, url in scored if url.endswith(".mp4")), None)
    if gif and "revision" not in gif:
        gif = gif + "/revision/latest?format=original"
    if video and "revision" not in video:
        video = video + "/revision/latest?format=original"
    return gif, video


def talent_kind(step: dict) -> str:
    title = step.get("title", "")
    if title.startswith("Обычная атака"):
        return "attack"
    if title.startswith("Элементальный навык"):
        return "skill"
    if title.startswith("Взрыв стихии"):
        return "burst"
    if title.startswith("Созвездие"):
        return "constellation"
    return "passive"


def attach_one(record: dict, trailers: dict[str, list[dict]]) -> dict:
    en = yatta_en(str(record["id"]))
    html = gallery_html(record["nameEn"])
    previews = extract_previews(html) if html else []
    en_talents = (en or {}).get("talent") or {}

    for step in record.get("talentSteps") or []:
        kind = talent_kind(step)
        numeric = re.sub(r"^talent-", "", step.get("id", ""))
        # traveler ids like Fire-0
        yatta_key = numeric.split("-")[-1] if "-" in numeric and not numeric.isdigit() else numeric
        if not yatta_key.isdigit() and "-" in step.get("id", ""):
            yatta_key = step["id"].split("-")[-1]
        en_item = en_talents.get(yatta_key) or en_talents.get(str(yatta_key))
        if en_item and en_item.get("icon"):
            step["iconUrl"] = f"https://gi.yatta.moe/assets/UI/{en_item['icon']}.png"
        if en_item and kind != "constellation":
            gif, video = pick_preview(previews, en_item.get("name") or "", kind)
            if gif:
                step["previewGif"] = gif
            if video:
                step["previewVideo"] = video

    videos: list[dict] = []
    for key in (record["nameEn"], record.get("shortName"), record.get("name")):
        for video in trailers.get(key or "", []):
            if all(item["youtubeId"] != video["youtubeId"] for item in videos):
                videos.append(video)
    # filename match in gallery youtube
    gallery_ids = sorted(set(re.findall(r"(?:youtube\.com/embed/|youtu\.be/|youtube\.com/watch\?v=)([\w-]{11})", html)))
    if gallery_ids and not videos:
        videos.append({"title": f"Трейлер: {record['name']}", "youtubeId": gallery_ids[0]})
    record["videos"] = videos
    return record


def main() -> None:
    trailers = fetch_trailer_map()
    print("trailer names", len(trailers))
    ok_preview = 0
    ok_video = 0
    for path in sorted(CHAR_DIR.glob("*.md")):
        raw = path.read_text(encoding="utf-8")
        record, body = parse_md(raw)
        record = attach_one(record, trailers)
        previews = sum(1 for step in record["talentSteps"] if step.get("previewVideo") or step.get("previewGif"))
        if previews:
            ok_preview += 1
        if record.get("videos"):
            ok_video += 1
        path.write_text(render_md(record, body), encoding="utf-8")
        print(path.stem, "previews", previews, "videos", len(record.get("videos") or []))
        time.sleep(0.08)
    print("done preview_chars", ok_preview, "video_chars", ok_video)


if __name__ == "__main__":
    main()
