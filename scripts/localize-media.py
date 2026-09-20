#!/usr/bin/env python3
"""Скачивает картинки персонажей в public/media и переписывает URL в исследованиях."""

from __future__ import annotations

import hashlib
import json
import re
import shutil
import subprocess
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parents[1]
CHAR_DIR = ROOT / "research" / "characters"
MEDIA = ROOT / "public" / "media"
COMMON = MEDIA / "common"
MEDIA.mkdir(parents=True, exist_ok=True)
COMMON.mkdir(parents=True, exist_ok=True)

IMAGE_EXT = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".mp4"}
SHARED_PREFIXES = (
    "Skill_A_",
    "UI_Talent_Combine",
    "UI_Talent_Explosion",
    "UI_Talent_Collect",
    "UI_Talent_E_Mora",
)


def parse_md(raw: str) -> tuple[dict, str]:
    end = raw.find("\n---\n", 4)
    return json.loads(raw[4:end]), raw[end + 5 :]


def filename_from_url(url: str) -> str:
    path = unquote(urlparse(url.split("?")[0]).path)
    parts = [part for part in path.split("/") if part]
    for part in reversed(parts):
        lower = part.lower()
        if any(lower.endswith(ext) for ext in IMAGE_EXT):
            return re.sub(r"[^a-zA-Z0-9._-]", "_", part)
    digest = hashlib.md5(url.encode()).hexdigest()[:16]
    return f"{digest}.img"


def is_shared_name(name: str) -> bool:
    return name.startswith(SHARED_PREFIXES)


def should_skip(url: str) -> bool:
    if "Character_Details" in url and ".gif" in url:
        return True
    if re.search(r"Idle_[^/]+_([2-9]|1[0-9])\.", url):
        return True
    return False


def collect_urls(record: dict) -> list[tuple[str, str, int | None]]:
    """Возвращает (поле, url, индекс шага или None)."""
    found: list[tuple[str, str, int | None]] = []
    for image in record.get("images") or []:
        found.append(("images", image.get("url") or "", None))
    for image in record.get("storyArt") or []:
        found.append(("storyArt", image.get("url") or "", None))
    for index, step in enumerate(record.get("talentSteps") or []):
        for key in ("iconUrl", "previewGif", "previewVideo"):
            if step.get(key):
                found.append((key, step[key], index))
    return found


def fallbacks(url: str) -> list[str]:
    if not url.startswith("http"):
        return []
    variants: list[str] = []
    seen: set[str] = set()

    def add(item: str) -> None:
        if item and item not in seen:
            seen.add(item)
            variants.append(item)

    no_query = url.split("?")[0]
    name = filename_from_url(url)
    preview = "Preview" in name
    if "wikia.nocookie.net" in no_query:
        base = no_query.split("/revision/")[0]
        add(base + "/revision/latest?format=original")
        add(url if "format=original" in url else "")
        add(no_query)
        if not preview:
            add(base + "/revision/latest/scale-to-width-down/480")
    else:
        add(url)
        add(no_query)
    if name.startswith(("Skill_", "UI_")):
        add(f"https://gi.yatta.moe/assets/UI/{name}")
    return variants


def sniff_ext(path: Path) -> str | None:
    header = path.read_bytes()[:16]
    if header.startswith(b"GIF8"):
        return ".gif"
    if header.startswith(b"\x89PNG"):
        return ".png"
    if header.startswith(b"\xff\xd8"):
        return ".jpg"
    if header.startswith(b"RIFF") and b"WEBP" in header:
        return ".webp"
    if header[4:8] == b"ftyp":
        return ".mp4"
    return None


def existing_variant(dest: Path) -> Path | None:
    if dest.exists() and dest.stat().st_size > 500:
        return dest
    # Fandom thumbnailer WebP is not a substitute for a real Preview.gif.
    if "Preview" in dest.stem and dest.suffix.lower() in {".gif", ".mp4"}:
        return None
    stills = {".png", ".jpg", ".jpeg", ".gif", ".webp"}
    if dest.suffix.lower() not in stills:
        return None
    for ext in stills:
        candidate = dest.with_suffix(ext)
        if candidate.exists() and candidate.stat().st_size > 500:
            return candidate
    return None


def download(url: str, dest: Path) -> Path | None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    present = existing_variant(dest)
    if present:
        return present
    if dest.exists() and dest.stat().st_size > 500:
        return dest
    for source in fallbacks(url):
        tmp = dest.with_suffix(dest.suffix + ".part")
        result = subprocess.run(
            [
                "curl",
                "-fsSL",
                "-A",
                "Mozilla/5.0 GenshinVitrine/1.0",
                "-m",
                "25",
                "-o",
                str(tmp),
                source,
            ],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0 or not tmp.exists() or tmp.stat().st_size < 200:
            if tmp.exists():
                tmp.unlink()
            continue
        if tmp.stat().st_size > 5_000_000:
            tmp.unlink()
            continue
        real_ext = sniff_ext(tmp)
        want = dest.suffix.lower()
        if want == ".gif" and real_ext == ".webp":
            tmp.unlink()
            continue
        if want == ".mp4" and real_ext != ".mp4":
            tmp.unlink()
            continue
        final = dest
        if real_ext and want != real_ext:
            if want == ".gif":
                tmp.unlink()
                continue
            final = dest.with_suffix(real_ext)
        if final.exists() and final.stat().st_size > 500:
            tmp.unlink()
            return final
        tmp.replace(final)
        return final
    return None


def index_existing() -> dict[str, Path]:
    found: dict[str, Path] = {}
    if not MEDIA.exists():
        return found
    for path in MEDIA.rglob("*"):
        if path.is_file() and path.suffix.lower() in IMAGE_EXT:
            found.setdefault(path.name, path)
    return found


def copy_into(source: Path, dest: Path) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 500:
        return dest
    shutil.copy2(source, dest)
    return dest


def rewrite_record(
    record: dict,
    mapping: dict[str, str],
    existing: dict[str, Path],
) -> dict:
    def localize(url: str, slug: str) -> str | None:
        if not url:
            return None
        if url in mapping:
            return mapping[url]
        if url.startswith("/media/"):
            disk = ROOT / "public" / url.lstrip("/")
            if disk.exists() and disk.stat().st_size > 200:
                return url
            name = Path(url).name
            source = existing.get(name)
            if source and source.exists():
                dest = MEDIA / slug / name
                copy_into(source, dest)
                existing.setdefault(name, dest)
                return f"/media/{slug}/{name}"
            yatta = f"https://gi.yatta.moe/assets/UI/{name}"
            dest = (COMMON if is_shared_name(name) else MEDIA / slug) / name
            saved = download(yatta, dest)
            if saved:
                existing.setdefault(saved.name, saved)
                rel = saved.relative_to(MEDIA)
                return f"/media/{rel.as_posix()}"
            return None
        return None

    slug = record["slug"]

    images = []
    for image in record.get("images") or []:
        local = localize(image.get("url") or "", slug)
        if local:
            image = {**image, "url": local}
            images.append(image)
    record["images"] = images

    story = []
    for image in record.get("storyArt") or []:
        local = localize(image.get("url") or "", slug)
        if local:
            image = {**image, "url": local}
            story.append(image)
    record["storyArt"] = story

    for step in record.get("talentSteps") or []:
        for key in ("iconUrl", "previewGif", "previewVideo"):
            value = step.get(key)
            if not value:
                continue
            local = localize(value, slug)
            if local:
                step[key] = local
            else:
                step.pop(key, None)
        gif = step.get("previewGif") or ""
        video = step.get("previewVideo") or ""
        if gif.startswith("/media/") and not video.endswith(".mp4"):
            step.pop("previewVideo", None)
    return record


def main() -> None:
    existing = index_existing()
    jobs: list[tuple[str, Path]] = []
    per_record: list[tuple[Path, dict, str, list[str]]] = []

    for path in sorted(CHAR_DIR.glob("*.md")):
        raw = path.read_text(encoding="utf-8")
        record, body = parse_md(raw)
        urls = []
        for _field, url, _index in collect_urls(record):
            if url.startswith("http") and url not in urls and not should_skip(url):
                urls.append(url)
        per_record.append((path, record, body, urls))
        slug = record["slug"]
        for url in urls:
            name = filename_from_url(url)
            folder = COMMON if is_shared_name(name) else MEDIA / slug
            jobs.append((url, folder / name))

    unique_jobs: dict[str, Path] = {}
    for url, dest in jobs:
        unique_jobs.setdefault(url, dest)

    ok = 0
    fail = 0
    mapping: dict[str, str] = {}
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(download, url, dest): (url, dest) for url, dest in unique_jobs.items()}
        for future in as_completed(futures):
            url, dest = futures[future]
            saved = future.result()
            if saved:
                ok += 1
                existing.setdefault(saved.name, saved)
                mapping[url] = f"/media/{saved.relative_to(MEDIA).as_posix()}"
            else:
                fail += 1
            done = ok + fail
            if done % 40 == 0 or done == len(unique_jobs):
                print("progress", done, "/", len(unique_jobs), "ok", ok, "fail", fail, flush=True)

    print("downloaded", ok, "fail", fail, "total", len(unique_jobs))

    for path, record, body, _urls in per_record:
        record = rewrite_record(record, mapping, existing)
        path.write_text(
            "---\n" + json.dumps(record, ensure_ascii=False, indent=2) + "\n---\n" + body,
            encoding="utf-8",
        )


if __name__ == "__main__":
    main()
