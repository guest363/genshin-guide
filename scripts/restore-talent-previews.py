#!/usr/bin/env python3
"""Re-download real looping GIF/MP4 combat talent previews from Fandom."""

from __future__ import annotations

import json
import re
import subprocess
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import quote, unquote, urlparse

ROOT = Path(__file__).resolve().parents[1]
CHAR_DIR = ROOT / "research" / "characters"
MEDIA = ROOT / "public" / "media"
CACHE = Path("/tmp/grok-goal-a057ac22dd42/implementer/media-cache")
CACHE.mkdir(parents=True, exist_ok=True)

UA = "Mozilla/5.0 GenshinVitrine/1.0"
MAX_GIF = 5_000_000
MAX_MP4 = 6_000_000
YATTA_UA = "Mozilla/5.0 GenshinVitrineResearch/1.0"

TRAVELER_FILES = [
    "Aether_Normal_Preview.gif",
    "Aether_Normal_Preview.mp4",
    "Palm_Vortex_Press_(Aether)_Preview.gif",
    "Palm_Vortex_Press_(Aether)_Preview.mp4",
    "Gust_Surge_(Aether)_Preview.gif",
    "Gust_Surge_(Aether)_Preview.mp4",
    "Starfell_Sword_Press_(Aether)_Preview.gif",
    "Starfell_Sword_Press_(Aether)_Preview.mp4",
    "Wake_of_Earth_(Aether)_Preview.gif",
    "Wake_of_Earth_(Aether)_Preview.mp4",
    "Lightning_Blade_(Aether)_Preview.gif",
    "Lightning_Blade_(Aether)_Preview.mp4",
    "Bellowing_Thunder_(Aether)_Preview.gif",
    "Bellowing_Thunder_(Aether)_Preview.mp4",
    "Razorgrass_Blade_(Aether)_Preview.gif",
    "Razorgrass_Blade_(Aether)_Preview.mp4",
    "Surgent_Manifestation_(Aether)_Preview.gif",
    "Surgent_Manifestation_(Aether)_Preview.mp4",
    "Aquacrest_Saber_Press_(Aether)_Preview.gif",
    "Aquacrest_Saber_Press_(Aether)_Preview.mp4",
    "Rising_Waters_(Aether)_Preview.gif",
    "Rising_Waters_(Aether)_Preview.mp4",
    "Flowfire_Blade_(Aether)_Preview.gif",
    "Flowfire_Blade_(Aether)_Preview.mp4",
    "Plains_Scorcher_(Aether)_Preview.gif",
    "Plains_Scorcher_(Aether)_Preview.mp4",
]

TRAVELER_EN: dict[tuple[str, str], str] = {
    ("Wind", "attack"): "Aether Normal",
    ("Wind", "skill"): "Palm Vortex Press Aether",
    ("Wind", "burst"): "Gust Surge Aether",
    ("Rock", "attack"): "Aether Normal",
    ("Rock", "skill"): "Starfell Sword Press Aether",
    ("Rock", "burst"): "Wake of Earth Aether",
    ("Electric", "attack"): "Aether Normal",
    ("Electric", "skill"): "Lightning Blade Aether",
    ("Electric", "burst"): "Bellowing Thunder Aether",
    ("Grass", "attack"): "Aether Normal",
    ("Grass", "skill"): "Razorgrass Blade Aether",
    ("Grass", "burst"): "Surgent Manifestation Aether",
    ("Water", "attack"): "Aether Normal",
    ("Water", "skill"): "Aquacrest Saber Press Aether",
    ("Water", "burst"): "Rising Waters Aether",
    ("Fire", "attack"): "Aether Normal",
    ("Fire", "skill"): "Flowfire Blade Aether",
    ("Fire", "burst"): "Plains Scorcher Aether",
    ("Ice", "attack"): "Aether Normal",
    ("Ice", "skill"): "Ice Fog Piercer Aether",
    ("Ice", "burst"): "Ice Fog Piercer Aether",
}


def parse_md(raw: str) -> tuple[dict, str]:
    end = raw.find("\n---\n", 4)
    return json.loads(raw[4:end]), raw[end + 5 :]


def render_md(record: dict, body: str) -> str:
    return "---\n" + json.dumps(record, ensure_ascii=False, indent=2) + "\n---\n" + body


def norm(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def combat_kind(title: str) -> str | None:
    if title.startswith("Обычная атака"):
        return "attack"
    if title.startswith("Элементальный навык"):
        return "skill"
    if title.startswith("Взрыв стихии"):
        return "burst"
    return None


def filename_from_url(url: str) -> str:
    path = unquote(urlparse(url.split("?")[0]).path)
    parts = [part for part in path.split("/") if part]
    for part in reversed(parts):
        lower = part.lower()
        if lower.endswith((".gif", ".mp4", ".webp", ".png")):
            return re.sub(r"[^a-zA-Z0-9._-]", "_", part)
    return re.sub(r"[^a-zA-Z0-9._-]", "_", Path(path).name)


def sniff(path: Path) -> str:
    if not path.exists():
        return "MISSING"
    header = path.read_bytes()[:16]
    if header.startswith(b"GIF8"):
        return "GIF"
    if header.startswith(b"RIFF") and b"WEBP" in header:
        return "WEBP"
    if header[4:8] == b"ftyp":
        return "MP4"
    if header.startswith(b"\x89PNG"):
        return "PNG"
    return "OTHER"


def is_looping_gif(path: Path) -> bool:
    data = path.read_bytes()
    if b"NETSCAPE2.0" in data:
        return True
    return data.count(b"\x2C") >= 2


def original_url(url: str) -> str:
    base = url.split("?")[0].split("/revision")[0]
    return base + "/revision/latest?format=original"


def extract_preview_urls(html: str) -> dict[str, str]:
    found = re.findall(
        r"https://static\.wikia\.nocookie\.net/gensin-impact/images/[^\"']+Preview\.(?:gif|mp4)[^\"']*",
        html,
    )
    mapped: dict[str, str] = {}
    for url in found:
        if "Character_Details" in url:
            continue
        base = url.split("/revision")[0]
        name = unquote(Path(urlparse(base).path).name)
        mapped.setdefault(name, base)
        mapped.setdefault(name.replace(" ", "_"), base)
    return mapped


def curl_text(url: str, timeout: int = 30) -> str:
    result = subprocess.run(
        ["curl", "-sS", "-A", YATTA_UA, "-m", str(timeout), url],
        capture_output=True,
        text=True,
    )
    return result.stdout if result.returncode == 0 else ""


def yatta_en(avatar_id: str) -> dict | None:
    key = avatar_id.split("-")[0]
    cache = CACHE / f"en-{key}.json"
    if cache.exists() and cache.stat().st_size > 200:
        try:
            payload = json.loads(cache.read_text())
            return payload.get("data") or payload
        except json.JSONDecodeError:
            return None
    payload = curl_text(f"https://gi.yatta.moe/api/v2/en/avatar/{key}")
    if not payload:
        return None
    cache.write_text(payload, encoding="utf-8")
    try:
        parsed = json.loads(payload)
    except json.JSONDecodeError:
        return None
    return parsed.get("data") or parsed


def gallery_map(name_en: str) -> dict[str, str]:
    cache = CACHE / f"gallery-{norm(name_en)}.html"
    if cache.exists() and cache.stat().st_size > 500:
        return extract_preview_urls(cache.read_text(encoding="utf-8", errors="replace"))
    return {}


def index_all_galleries() -> dict[str, str]:
    mapped: dict[str, str] = {}
    for path in CACHE.glob("gallery-*.html"):
        mapped.update(extract_preview_urls(path.read_text(encoding="utf-8", errors="replace")))
    return mapped


def imageinfo_urls(filenames: list[str]) -> dict[str, str]:
    mapped: dict[str, str] = {}
    pending = []
    for name in filenames:
        title = unquote(name).replace("_", " ")
        if not title.lower().startswith("file:"):
            title = "File:" + title
        pending.append(title)
    for start in range(0, len(pending), 40):
        chunk = pending[start : start + 40]
        url = (
            "https://genshin-impact.fandom.com/api.php?action=query&prop=imageinfo"
            "&iiprop=url&format=json&titles="
            + quote("|".join(chunk), safe="|:")
        )
        try:
            payload = json.loads(curl_text(url, timeout=45))
        except json.JSONDecodeError:
            continue
        pages = (payload.get("query") or {}).get("pages") or {}
        for page in pages.values():
            infos = page.get("imageinfo") or []
            if not infos:
                continue
            file_url = infos[0].get("url") or ""
            if not file_url:
                continue
            base = file_url.split("/revision")[0]
            fname = unquote(Path(urlparse(base).path).name)
            mapped[fname] = base
            mapped[fname.replace(" ", "_")] = base
    return mapped


def pick_from_files(
    files: dict[str, str],
    talent_name: str,
    kind: str,
    existing_stem: str,
) -> tuple[str | None, str | None]:
    target = norm(talent_name)
    exist = norm(existing_stem.replace("Preview", ""))
    scored: list[tuple[int, str, str]] = []
    for name, base in files.items():
        if "Character_Details" in name:
            continue
        stem = Path(name).stem
        key = norm(stem.replace("Preview", ""))
        score = 0
        if exist and (exist == key or exist in key or key in exist):
            score += 22
        if target and (target in key or key in target):
            score += 12
        else:
            tokens = set(re.findall(r"[a-z]+", talent_name.lower()))
            keys = set(re.findall(r"[a-z]+", stem.lower().replace("_", " ")))
            overlap = tokens & keys - {"the", "of", "a", "and", "preview", "art", "normal"}
            if overlap:
                score += min(8, len(overlap) * 2)
            elif score < 20:
                continue
        if kind == "attack" and "normal" in key:
            score += 5
        if kind != "attack" and "normal" in key:
            score -= 5
        if "charged" in key or "plunging" in key:
            score -= 6
        if "aether" in key:
            score += 1
        scored.append((score, name, base))
    scored.sort(reverse=True)
    gif = next((base for score, name, base in scored if name.lower().endswith(".gif") and score >= 10), None)
    video = next((base for score, name, base in scored if name.lower().endswith(".mp4") and score >= 10), None)
    return gif, video


def stems_of_step(step: dict) -> str:
    for key in ("previewGif", "previewVideo"):
        value = step.get(key) or ""
        if value:
            return Path(value).stem
    return ""


def yatta_talent_name(record: dict, step: dict, kind: str) -> str:
    if record.get("slug") == "puteshestvennik":
        numeric = re.sub(r"^talent-", "", step.get("id", ""))
        element = numeric.split("-")[0] if "-" in numeric else ""
        return TRAVELER_EN.get((element, kind), "")
    en = yatta_en(str(record["id"]))
    talents = (en or {}).get("talent") or {}
    numeric = re.sub(r"^talent-", "", step.get("id", ""))
    yatta_key = numeric.split("-")[-1] if "-" in numeric and not numeric.isdigit() else numeric
    if not yatta_key.isdigit() and "-" in step.get("id", ""):
        yatta_key = step["id"].split("-")[-1]
    item = talents.get(yatta_key) or talents.get(str(yatta_key))
    return (item or {}).get("name") or ""


def lookup_name(files: dict[str, str], stem: str, ext: str) -> str | None:
    if not stem:
        return None
    candidates = [
        f"{stem}{ext}",
        f"{stem.replace(' ', '_')}{ext}",
        unquote(f"{stem}{ext}"),
    ]
    for name in candidates:
        if name in files:
            return files[name]
        spaced = name.replace("_", " ")
        if spaced in files:
            return files[spaced]
    return None


def download_original(url: str, dest: Path, max_bytes: int) -> Path | None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(dest.suffix + ".part")
    if tmp.exists():
        tmp.unlink()
    result = subprocess.run(
        [
            "curl",
            "-fsSL",
            "-A",
            UA,
            "-m",
            "50",
            "--max-filesize",
            str(max_bytes),
            "-o",
            str(tmp),
            original_url(url),
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0 or not tmp.exists() or tmp.stat().st_size < 400:
        if tmp.exists():
            tmp.unlink()
        return None
    if tmp.stat().st_size > max_bytes:
        tmp.unlink()
        return None
    tmp.replace(dest)
    return dest


def usable_gif(path: Path) -> bool:
    return (
        sniff(path) == "GIF"
        and path.stat().st_size <= MAX_GIF
        and path.stat().st_size > 800
        and is_looping_gif(path)
    )


def usable_mp4(path: Path) -> bool:
    return sniff(path) == "MP4" and 800 < path.stat().st_size <= MAX_MP4


def fetch_asset(url: str, dest: Path, kind: str) -> Path | None:
    limit = MAX_GIF if kind == "gif" else MAX_MP4
    if dest.exists() and (usable_gif(dest) if kind == "gif" else usable_mp4(dest)):
        return dest
    saved = download_original(url, dest, limit)
    if not saved:
        return None
    ok = usable_gif(saved) if kind == "gif" else usable_mp4(saved)
    if ok:
        return saved
    saved.unlink(missing_ok=True)
    return None


def main() -> None:
    files = index_all_galleries()
    records: list[tuple[Path, dict, str]] = []
    wanted_names: list[str] = []
    jobs: list[dict] = []

    for path in sorted(CHAR_DIR.glob("*.md")):
        record, body = parse_md(path.read_text(encoding="utf-8"))
        records.append((path, record, body))
        local_files = dict(files)
        local_files.update(gallery_map(record.get("nameEn") or ""))
        for step in record.get("talentSteps") or []:
            kind = combat_kind(step.get("title") or "")
            if not kind:
                continue
            stem = stems_of_step(step)
            en_name = yatta_talent_name(record, step, kind)
            gif_url = lookup_name(local_files, stem, ".gif")
            mp4_url = lookup_name(local_files, stem, ".mp4")
            if not gif_url or not mp4_url:
                picked_gif, picked_mp4 = pick_from_files(local_files, en_name or stem, kind, stem)
                gif_url = gif_url or picked_gif
                mp4_url = mp4_url or picked_mp4
            if stem:
                wanted_names.append(f"{stem}.gif")
                wanted_names.append(f"{stem}.mp4")
            if en_name:
                guess = re.sub(r"[^a-zA-Z0-9._-]+", "_", en_name) + "_Preview"
                wanted_names.append(guess + ".gif")
                wanted_names.append(guess + ".mp4")
            jobs.append(
                {
                    "slug": record["slug"],
                    "step_id": step["id"],
                    "kind": kind,
                    "en_name": en_name,
                    "stem": stem,
                    "gif_url": gif_url,
                    "mp4_url": mp4_url,
                }
            )

    wanted_names.extend(TRAVELER_FILES)
    missing_names = [name for name in dict.fromkeys(wanted_names) if name not in files]
    extra = imageinfo_urls(missing_names)
    files.update(extra)
    print("gallery files", len(files), "imageinfo extra", len(extra), "jobs", len(jobs))

    for job in jobs:
        stem = job["stem"]
        if not job["gif_url"]:
            job["gif_url"] = lookup_name(files, stem, ".gif")
        if not job["mp4_url"]:
            job["mp4_url"] = lookup_name(files, stem, ".mp4")
        if not job["gif_url"] or not job["mp4_url"]:
            picked_gif, picked_mp4 = pick_from_files(files, job["en_name"] or stem, job["kind"], stem)
            job["gif_url"] = job["gif_url"] or picked_gif
            job["mp4_url"] = job["mp4_url"] or picked_mp4

    saved_map: dict[str, Path] = {}

    def run_downloads(kind: str, items: list[tuple[str, Path]]) -> None:
        unique: dict[str, tuple[str, Path]] = {}
        for url, dest in items:
            unique.setdefault(original_url(url), (url, dest))
        if not unique:
            return
        ok = 0
        fail = 0
        with ThreadPoolExecutor(max_workers=8) as pool:
            futures = {
                pool.submit(fetch_asset, url, dest, kind): (key, dest)
                for key, (url, dest) in unique.items()
            }
            total = len(futures)
            for future in as_completed(futures):
                key, dest = futures[future]
                try:
                    saved = future.result()
                except Exception:
                    saved = None
                if saved:
                    ok += 1
                    saved_map[key] = saved
                else:
                    fail += 1
                done = ok + fail
                if done % 20 == 0 or done == total:
                    print(kind, "progress", done, "/", total, "ok", ok, "fail", fail, flush=True)
        print(kind, "done ok", ok, "fail", fail)

    gif_jobs = []
    for job in jobs:
        if job["gif_url"]:
            dest = MEDIA / job["slug"] / filename_from_url(job["gif_url"])
            gif_jobs.append((job["gif_url"], dest))
    run_downloads("gif", gif_jobs)

    mp4_jobs = []
    for job in jobs:
        gif_path = None
        if job["gif_url"]:
            gif_path = saved_map.get(original_url(job["gif_url"]))
            if gif_path is None:
                candidate = MEDIA / job["slug"] / filename_from_url(job["gif_url"])
                if usable_gif(candidate):
                    gif_path = candidate
        if gif_path:
            continue
        if job["mp4_url"]:
            dest = MEDIA / job["slug"] / filename_from_url(job["mp4_url"])
            mp4_jobs.append((job["mp4_url"], dest))
    run_downloads("mp4", mp4_jobs)

    gif_count = 0
    mp4_count = 0
    none_count = 0
    for path, record, body in records:
        slug = record["slug"]
        by_id = {job["step_id"]: job for job in jobs if job["slug"] == slug}
        for step in record.get("talentSteps") or []:
            job = by_id.get(step["id"])
            if not job:
                continue
            gif_path = None
            mp4_path = None
            if job["gif_url"]:
                gif_path = saved_map.get(original_url(job["gif_url"]))
                if gif_path is None:
                    candidate = MEDIA / slug / filename_from_url(job["gif_url"])
                    if usable_gif(candidate):
                        gif_path = candidate
            if job["mp4_url"]:
                mp4_path = saved_map.get(original_url(job["mp4_url"]))
                if mp4_path is None:
                    candidate = MEDIA / slug / filename_from_url(job["mp4_url"])
                    if usable_mp4(candidate):
                        mp4_path = candidate
            step.pop("previewGif", None)
            step.pop("previewVideo", None)
            if gif_path and usable_gif(gif_path):
                rel = gif_path.relative_to(MEDIA)
                step["previewGif"] = f"/media/{rel.as_posix()}"
                gif_count += 1
            elif mp4_path and usable_mp4(mp4_path):
                rel = mp4_path.relative_to(MEDIA)
                step["previewVideo"] = f"/media/{rel.as_posix()}"
                mp4_count += 1
            else:
                none_count += 1
        path.write_text(render_md(record, body), encoding="utf-8")

    print(
        "combat looping gif",
        gif_count,
        "mp4",
        mp4_count,
        "none",
        none_count,
        "total",
        gif_count + mp4_count + none_count,
    )


if __name__ == "__main__":
    main()
