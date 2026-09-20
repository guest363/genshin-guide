#!/usr/bin/env python3
"""Собирает Markdown-исследования играбельных персонажей из официальных карточек Yatta (дамп архива HoYoverse) и сверки с Fandom Character/List."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
YATTA_DIR = Path("/tmp/grok-goal-a057ac22dd42/implementer/yatta")
LIST_PATH = Path("/tmp/grok-goal-a057ac22dd42/implementer/avatars-ru.json")
FANDOM_PATH = Path("/tmp/grok-goal-a057ac22dd42/implementer/fandom-120.txt")
OUT_DIR = ROOT / "research" / "characters"
ROSTER_PATH = ROOT / "research" / "roster.md"

ELEMENT = {
    "Fire": ("pyro", "Пиро"),
    "Water": ("hydro", "Гидро"),
    "Wind": ("anemo", "Анемо"),
    "Electric": ("electro", "Электро"),
    "Grass": ("dendro", "Дендро"),
    "Ice": ("cryo", "Крио"),
    "Rock": ("geo", "Гео"),
    "None": ("adaptive", "Адаптивный"),
}

WEAPON = {
    "WEAPON_SWORD_ONE_HAND": ("sword", "одноручный меч"),
    "WEAPON_CLAYMORE": ("claymore", "двуручный меч"),
    "WEAPON_POLE": ("polearm", "древковое оружие"),
    "WEAPON_BOW": ("bow", "стрелковое оружие"),
    "WEAPON_CATALYST": ("catalyst", "катализатор"),
}

REGION = {
    "MONDSTADT": ("mondstadt", "Мондштадт"),
    "LIYUE": ("liyue", "Ли Юэ"),
    "INAZUMA": ("inazuma", "Инадзума"),
    "SUMERU": ("sumeru", "Сумеру"),
    "FONTAINE": ("fontaine", "Фонтейн"),
    "NATLAN": ("natlan", "Натлан"),
    "NODKRAI": ("nod-krai", "Нод-Край"),
    "NODKRAI_ZIBAI": ("liyue", "Ли Юэ"),
    "FATUI": ("snezhnaya", "Снежная"),
    "SNEZHNAYA": ("snezhnaya", "Снежная"),
    "SNEZHNAYA_STAR": ("snezhnaya", "Снежная"),
    "RANGER": ("none", "Без региона"),
    "OMNI_SCOURGE": ("none", "Без региона"),
    "HVISION": ("none", "Без региона"),
    "MAINACTOR": ("none", "Без региона"),
}

STAT_LABEL = {
    "FIGHT_PROP_CRITICAL_HURT": "критический урон",
    "FIGHT_PROP_CRITICAL": "шанс критического попадания",
    "FIGHT_PROP_ATTACK_PERCENT": "сила атаки",
    "FIGHT_PROP_HP_PERCENT": "здоровье",
    "FIGHT_PROP_DEFENSE_PERCENT": "защита",
    "FIGHT_PROP_ELEMENT_MASTERY": "мастерство стихий",
    "FIGHT_PROP_CHARGE_EFFICIENCY": "восстановление энергии",
    "FIGHT_PROP_HEAL_ADD": "бонус лечения",
    "FIGHT_PROP_PHYSICAL_ADD_HURT": "бонус физического урона",
    "FIGHT_PROP_ELEC_ADD_HURT": "бонус Электро урона",
    "FIGHT_PROP_ROCK_ADD_HURT": "бонус Гео урона",
    "FIGHT_PROP_FIRE_ADD_HURT": "бонус Пиро урона",
    "FIGHT_PROP_WATER_ADD_HURT": "бонус Гидро урона",
    "FIGHT_PROP_ICE_ADD_HURT": "бонус Крио урона",
    "FIGHT_PROP_WIND_ADD_HURT": "бонус Анемо урона",
    "FIGHT_PROP_GRASS_ADD_HURT": "бонус Дендро урона",
    "FIGHT_PROP_BASE_HP": "здоровье",
    "FIGHT_PROP_BASE_ATTACK": "сила атаки",
    "FIGHT_PROP_BASE_DEFENSE": "защита",
}

REACTIONS = {
    "pyro": "Пар, таяние, перегрузка и горение",
    "hydro": "Пар, заряд, заморозка и бутонизация",
    "cryo": "Заморозка, таяние и сверхпроводник",
    "electro": "Заряд, перегрузка, сверхпроводник и стимуляция",
    "anemo": "Рассеивание чужой стихии",
    "geo": "Кристалл и щиты Гео",
    "dendro": "Бутонизация, стимуляция и горение",
    "adaptive": "Стихия меняется вместе с камнем стихий",
}

COLOR_RE = re.compile(r"</?color[^>]*>", re.I)
GENDER_RE = re.compile(r"\{M#([^}]*)\}\{F#([^}]*)\}")
BRACE_RE = re.compile(r"\{[^}]+\}")
HTML_RE = re.compile(r"<[^>]+>")
WIKI_HEADING_RE = re.compile(r"^=+\s*[^=\n]+?\s*=+\s*", re.M)

WEAPON_HINT = {
    "sword": "одноручные мечи",
    "claymore": "двуручные мечи",
    "polearm": "копья и пики",
    "bow": "луки",
    "catalyst": "катализаторы",
}

NO_NAMECARD_SUFFIXES = {
    "PlayerBoy",
    "PlayerGirl",
    "MannequinBoy",
    "MannequinGirl",
}


def clean_text(value: object) -> str:
    if value is None:
        return ""
    text = str(value)
    text = text.replace("\\n", "\n")
    text = COLOR_RE.sub("", text)
    text = HTML_RE.sub("", text)
    text = GENDER_RE.sub(r"\1", text)
    text = BRACE_RE.sub("", text)
    text = WIKI_HEADING_RE.sub("", text)
    text = text.replace("\xa0", " ")
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]+\n", "\n", text)
    return text.strip()


def slugify(name_en: str) -> str:
    slug = name_en.lower().strip()
    slug = slug.replace("'", "")
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    return slug.strip("-")


def icon_url(icon: str) -> str:
    return f"https://gi.yatta.moe/assets/UI/{icon}.png"


def splash_url(icon: str) -> str:
    suffix = icon.replace("UI_AvatarIcon_", "")
    return f"https://gi.yatta.moe/assets/UI/UI_Gacha_AvatarImg_{suffix}.png"


def namecard_url(icon: str) -> str | None:
    suffix = icon.replace("UI_AvatarIcon_", "")
    if suffix in NO_NAMECARD_SUFFIXES:
        return None
    return f"https://gi.yatta.moe/assets/UI/namecard/UI_NameCardPic_{suffix}_P.png"


def avatar_icon_suffix(url: str) -> str:
    match = re.search(r"UI_AvatarIcon_([^/.]+)", url)
    return match.group(1) if match else ""


def classify_talent(icon: str, name: str) -> str:
    if icon.startswith("Skill_A_"):
        return "attack"
    if icon.startswith("Skill_S_"):
        return "skill"
    if icon.startswith("Skill_E_"):
        return "burst"
    if "Combine" in icon:
        return "utility"
    lowered = name.lower()
    if "паден" in lowered or "sprint" in lowered:
        return "utility"
    return "passive"


def _talent_combat_text(talents: list[dict]) -> str:
    chunks: list[str] = []
    for item in talents:
        kind = item.get("kind")
        title = str(item.get("title") or item.get("name") or "")
        body = str(item.get("description") or item.get("body") or "")
        if kind in {"skill", "burst"} or title.startswith("Элементальный навык") or title.startswith(
            "Взрыв стихии"
        ):
            chunks.append(body)
    return "\n".join(chunks).lower()


def infer_role(talents: list[dict]) -> str:
    """Роль только по навыку и взрыву: лечение союзников, щит, иначе основной урон.

    Не считаем лекарем персонажа, у которого в тексте есть HP и «восстанавливает»
    в разных фразах (конструкция Уси, энергия, самолечение DPS).
    """
    text = _talent_combat_text(talents)
    ally_heal = bool(
        re.search(
            r"восстанавлива\w*.{0,80}hp.{0,50}(отряд|союз|активн|всем|персонаж)"
            r"|восстанавлива\w*.{0,50}(отряд|союз|активн|всем|персонаж).{0,50}hp"
            r"|(отряд|союз|активн|всем|персонаж).{0,50}восстанавлива\w*.{0,40}hp"
            r"|\bлечит\b.{0,30}(отряд|союз|активн|всех|персонаж)"
            r"|исцеля",
            text,
        )
    )
    creates_shield = bool(
        re.search(
            r"созда[её]т.{0,30}щит"
            r"|накладывает.{0,30}щит"
            r"|даёт.{0,30}щит"
            r"|щит,?\s+который поглощает"
            r"|прочность щита",
            text,
        )
    )
    if ally_heal and creates_shield:
        return "Лекарь и защита"
    if ally_heal:
        return "Лекарь"
    if creates_shield:
        return "Защита"
    return "Основной урон"


def weapon_guide_body(weapon_key: str, weapon_label: str, stat: str) -> str:
    hint = WEAPON_HINT.get(weapon_key, weapon_label)
    return (
        f"Нужен тип: {weapon_label}. "
        f"Смотрите {hint}, которые усиливают параметр «{stat}»."
    )


def fandom_wiki_url(name_en: str) -> str:
    page = name_en.replace(" ", "_")
    return f"https://genshin-impact.fandom.com/wiki/{page}"


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def talent_items(data: dict) -> list[dict]:
    talents = data.get("talent") or {}
    rows: list[dict] = []
    for key in sorted(talents, key=lambda item: int(item) if str(item).isdigit() else 99):
        item = talents[key]
        icon = item.get("icon") or ""
        name = clean_text(item.get("name"))
        rows.append(
            {
                "id": str(key),
                "kind": classify_talent(icon, name),
                "name": name,
                "description": clean_text(item.get("description")),
                "icon": icon,
                "iconUrl": icon_url(icon) if icon else "",
            }
        )
    return rows


def constellation_items(data: dict) -> list[dict]:
    constellations = data.get("constellation") or {}
    rows: list[dict] = []
    for key in sorted(constellations, key=lambda item: int(item) if str(item).isdigit() else 99):
        item = constellations[key]
        rows.append(
            {
                "id": int(item.get("id", key)) + 1,
                "name": clean_text(item.get("name")),
                "description": clean_text(item.get("description")),
            }
        )
    return rows


def base_stats(data: dict) -> dict[str, str]:
    props = ((data.get("upgrade") or {}).get("prop")) or []
    result: dict[str, str] = {}
    for item in props:
        label = STAT_LABEL.get(item.get("propType"), item.get("propType"))
        value = item.get("initValue")
        if isinstance(value, (int, float)):
            result[label] = str(round(value, 1) if value >= 10 else round(value, 2))
    return result


def kind_title(kind: str) -> str:
    return {
        "attack": "Обычная атака",
        "skill": "Элементальный навык",
        "burst": "Взрыв стихии",
        "passive": "Пассивный талант",
        "utility": "Дополнительный талант",
    }[kind]


def record_from_data(data: dict, name_en: str, extra_talents: list[dict] | None = None) -> dict:
    element_key, element_label = ELEMENT.get(data.get("element") or "None", ("adaptive", "Адаптивный"))
    weapon_key, weapon_label = WEAPON[data["weaponType"]]
    region_key, region_label = REGION.get(data.get("region") or "", ("none", "Без региона"))
    fetter = data.get("fetter") or {}
    title = clean_text(fetter.get("title")) or "Играбельный персонаж"
    detail = clean_text(fetter.get("detail"))
    constellation = clean_text(fetter.get("constellation")) or "—"
    affiliation = clean_text(fetter.get("native")) or region_label
    birthday = data.get("birthday") or [1, 1]
    birthday_label = f"{int(birthday[1]):02d}.{int(birthday[0]):02d}"
    talents = extra_talents if extra_talents is not None else talent_items(data)
    constellations = constellation_items(data)
    role = infer_role(talents)
    stat = STAT_LABEL.get(data.get("specialProp", ""), "сила атаки")
    stats = base_stats(data)
    icon = data["icon"]
    short = data["name"]
    full_name = name_en if name_en in {"Traveler", "Wonderland Manekin"} else short
    if name_en not in {"Traveler", "Wonderland Manekin"}:
        # Prefer official Russian name as the display name.
        full_name = short
        if name_en.startswith("Kamisato"):
            full_name = f"Камисато {short}" if "Камисато" not in short else short
        elif name_en.startswith("Kaedehara"):
            full_name = f"Каэдэхара {short}" if "Каэдэхара" not in short else short
        elif name_en.startswith("Sangonomiya"):
            full_name = f"Сангономия {short}" if "Сангономия" not in short else short
        elif name_en.startswith("Kujou"):
            full_name = f"Кудзё {short}" if "Кудзё" not in short else short
        elif name_en.startswith("Kuki"):
            full_name = f"Куки {short}" if "Куки" not in short else short
        elif name_en.startswith("Shikanoin"):
            full_name = f"Сиканоин {short}" if "Сиканоин" not in short else short
        elif name_en.startswith("Yumemizuki"):
            full_name = f"Юмэмидзуки {short}" if "Юмэмидзуки" not in short else short
        elif name_en == "Raiden Shogun":
            full_name = "Райдэн сёгун"
        elif name_en == "Hu Tao":
            full_name = "Ху Тао"
        elif name_en == "Yun Jin":
            full_name = "Юнь Цзинь"
        elif name_en == "Lan Yan":
            full_name = "Лань Янь"
        elif name_en == "Yaoyao":
            full_name = "Яо Яо"
        elif name_en == "Yanfei":
            full_name = "Янь Фэй"
        elif name_en == "Yelan":
            full_name = "Е Лань"
        elif name_en == "Baizhu":
            full_name = "Бай Чжу"
        elif name_en == "Xingqiu":
            full_name = "Син Цю"
        elif name_en == "Xinyan":
            full_name = "Синь Янь"
        elif name_en == "Xiangling":
            full_name = "Сян Лин"
        elif name_en == "Xianyun":
            full_name = "Сянь Юнь"
        elif name_en == "Zhongli":
            full_name = "Чжун Ли"
        elif name_en == "Chongyun":
            full_name = "Чун Юнь"
        elif name_en == "Shenhe":
            full_name = "Шэнь Хэ"
        elif name_en == "Ningguang":
            full_name = "Нин Гуан"
        elif name_en == "Ganyu":
            full_name = "Гань Юй"
        elif name_en == "Keqing":
            full_name = "Кэ Цин"
        elif name_en == "Qiqi":
            full_name = "Ци Ци"
        elif name_en == "Yae Miko":
            full_name = "Яэ Мико"
        elif name_en == "Arataki Itto":
            full_name = "Аратаки Итто"

    images = [
        {
            "id": "icon",
            "alt": f"Портрет: {full_name}",
            "url": icon_url(icon),
        },
        {
            "id": "splash",
            "alt": f"Иллюстрация молитвы: {full_name}",
            "url": splash_url(icon),
        },
    ]
    namecard = ((data.get("other") or {}).get("nameCard")) or {}
    card_url = namecard_url(icon)
    if namecard.get("name") and card_url:
        images.append(
            {
                "id": "namecard",
                "alt": f"Именная карта «{clean_text(namecard.get('name'))}»",
                "url": card_url,
            }
        )

    costumes = ((data.get("other") or {}).get("costume")) or []
    costume_names = [clean_text(item.get("name")) for item in costumes if item.get("name")]

    story_steps = [
        {
            "id": "who",
            "title": f"Кто такая {full_name}" if data.get("bodyType") in {"GIRL", "LADY", "LOLI"} else f"Кто такой {full_name}",
            "body": " ".join(
                part
                for part in (
                    f"{full_name} — {title.lower()}." if title and title != "Играбельный персонаж" else f"{full_name} — играбельный персонаж.",
                    detail.rstrip(".") + "." if detail else "",
                )
                if part
            ),
        },
        {
            "id": "origin",
            "title": "Откуда персонаж и чем занят",
            "body": (
                f"Регион в архиве — {region_label}. "
                f"Принадлежность: {affiliation}. "
                f"Созвездие называется «{constellation}»."
            ),
        },
    ]
    skill = next((item for item in talents if item["kind"] == "skill"), None)
    burst = next((item for item in talents if item["kind"] == "burst"), None)
    if skill or burst:
        bits = []
        if skill:
            bits.append(f"Элементальный навык «{skill['name']}» задаёт рисунок боя.")
        if burst:
            bits.append(f"Взрыв стихии «{burst['name']}» закрывает ротацию.")
        story_steps.append(
            {
                "id": "combat-identity",
                "title": "Как персонаж дерётся",
                "body": " ".join(bits) + f" Боевая роль по описанию талантов: {role.lower()}.",
            }
        )
    if costume_names:
        story_steps.append(
            {
                "id": "look",
                "title": "Как выглядит в архиве",
                "body": "В игре есть наряды: " + ", ".join(f"«{name}»" for name in costume_names) + ".",
            }
        )
    if namecard.get("description"):
        story_steps.append(
            {
                "id": "namecard",
                "title": "Именная карта",
                "body": clean_text(namecard.get("description")),
            }
        )

    talent_steps = []
    for item in talents:
        if not item["name"]:
            continue
        talent_steps.append(
            {
                "id": f"talent-{item['id']}",
                "title": f"{kind_title(item['kind'])}: {item['name']}",
                "body": item["description"] or "Описание в архиве не приведено.",
            }
        )
    for item in constellations:
        talent_steps.append(
            {
                "id": f"constellation-{item['id']}",
                "title": f"Созвездие {item['id']}: {item['name']}",
                "body": item["description"],
            }
        )

    attack = next((item for item in talents if item["kind"] == "attack"), None)
    rotation_bits = []
    if skill:
        rotation_bits.append(f"откройте бой навыком «{skill['name']}»")
    if attack:
        rotation_bits.append("доберьте обычными или заряженными атаками, пока навык работает")
    if burst:
        rotation_bits.append(f"закройте взрывом стихии «{burst['name']}»")
    if rotation_bits:
        rotation = ". Затем ".join(bit.rstrip(".") for bit in rotation_bits) + "."
        rotation = rotation[0].upper() + rotation[1:]
    else:
        rotation = "Сначала навык, затем атаки, затем взрыв стихии."

    guide_steps = [
        {
            "id": "role",
            "title": "Шаг 1. Поймите роль",
            "body": (
                f"{full_name} в бою закрывает роль: {role.lower()}. "
                f"Стихия — {element_label}, оружие — {weapon_label}. "
                f"Параметр возвышения — {stat}."
            ),
        },
        {
            "id": "weapon",
            "title": "Шаг 2. Выберите оружие",
            "body": weapon_guide_body(weapon_key, weapon_label, stat),
        },
        {
            "id": "artifacts",
            "title": "Шаг 3. Соберите артефакты",
            "body": (
                f"Наборы берите под {stat} и под стихию {element_label}. "
                "Часы — под основной параметр роли, кубок — под стихию, тусклый венец — под критический удар или лечение."
            ),
        },
        {
            "id": "team",
            "title": "Шаг 4. Соберите отряд",
            "body": (
                f"Стихия {element_label} хорошо собирает реакции: {REACTIONS[element_key]}. "
                "Добавьте персонажа, который включает нужную реакцию, и персонажа на лечение или щит."
            ),
        },
        {
            "id": "rotation",
            "title": "Шаг 5. Запомните ротацию",
            "body": rotation + " Не копируйте чужие проценты урона: смотрите текст своих талантов.",
        },
    ]

    profile_steps = [
        {
            "id": "overview",
            "title": "Обзор",
            "body": (
                f"{full_name} — {data['rank']}★, {element_label}, {weapon_label}. "
                f"Регион: {region_label}. Роль: {role.lower()}."
            ),
        },
        {
            "id": "story",
            "title": "История",
            "body": "Читайте историю короткими шагами: кто это, откуда, как дерётся.",
        },
        {
            "id": "talents",
            "title": "Таланты",
            "body": "Дальше — обычная атака, навык, взрыв стихии, пассивные таланты и созвездия.",
        },
        {
            "id": "guide",
            "title": "Гайд",
            "body": "Гайд идёт шагами: роль, оружие, артефакты, отряд, ротация.",
        },
    ]

    sources = [
        {
            "title": "Официальный архив персонажа (дамп игровых строк Yatta / HoYoverse)",
            "url": f"https://gi.yatta.moe/ru/archive/avatar/{data.get('route', '').replace(' ', '%20')}",
        },
        {
            "title": f"Genshin Impact Wiki — {name_en}",
            "url": fandom_wiki_url(name_en),
        },
        {
            "title": "Genshin Impact Wiki — Character/List",
            "url": "https://genshin-impact.fandom.com/wiki/Character/List",
        },
    ]

    slug = {
        "Traveler": "puteshestvennik",
        "Wonderland Manekin": "maneken-chudes",
    }.get(name_en, slugify(name_en))

    return {
        "id": str(data.get("id")),
        "slug": slug,
        "name": full_name,
        "shortName": short,
        "nameEn": name_en,
        "title": title,
        "rarity": int(data["rank"]),
        "element": element_key,
        "elementLabel": element_label,
        "weapon": weapon_key,
        "weaponLabel": weapon_label,
        "region": region_key,
        "regionLabel": region_label,
        "role": role,
        "birthday": birthday_label,
        "constellation": constellation,
        "affiliation": affiliation,
        "baseStats": stats,
        "ascensionStat": stat,
        "images": images,
        "profileSteps": profile_steps,
        "storySteps": story_steps,
        "talentSteps": talent_steps,
        "guideSteps": guide_steps,
        "sources": sources,
    }


def render_md(record: dict) -> str:
    front = json.dumps(record, ensure_ascii=False, indent=2)
    stats_lines = "\n".join(f"- {key}: {value}" for key, value in (record.get("baseStats") or {}).items())
    story = "\n\n".join(
        f"### {index}. {step['title']}\n\n{step['body']}" for index, step in enumerate(record["storySteps"], 1)
    )
    talents = "\n\n".join(
        f"### {step['title']}\n\n{step['body']}" for step in record["talentSteps"]
    )
    guide = "\n\n".join(
        f"### {step['title']}\n\n{step['body']}" for step in record["guideSteps"]
    )
    images = "\n".join(
        f"- ![{img['alt']}]({img['url']})" for img in record["images"]
    )
    sources = "\n".join(f"- [{item['title']}]({item['url']})" for item in record["sources"])
    return f"""---
{front}
---

# {record['name']}

{record['title']}. {record['rarity']}★ · {record['elementLabel']} · {record['weaponLabel']} · {record['regionLabel']}.

## Характеристики

- Редкость: {record['rarity']}★
- Стихия: {record['elementLabel']}
- Оружие: {record['weaponLabel']}
- Регион: {record['regionLabel']}
- Роль: {record['role']}
- День рождения: {record['birthday']}
- Созвездие: {record['constellation']}
- Принадлежность: {record['affiliation']}
- Параметр возвышения: {record['ascensionStat']}

Базовые значения 1 уровня из игрового архива:

{stats_lines or '- нет в карточке'}

## История

{story}

## Таланты и созвездия

{talents}

## Гайд

{guide}

## Картинки

{images}

## Источники

{sources}
"""


def normalize(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.lower())


def parse_existing_markdown(raw: str) -> dict:
    if not raw.startswith("---\n"):
        raise ValueError("no frontmatter")
    end = raw.find("\n---\n", 4)
    if end < 0:
        raise ValueError("no frontmatter end")
    parsed = json.loads(raw[4:end])
    if not isinstance(parsed, dict):
        raise ValueError("frontmatter is not an object")
    return parsed


def repair_record(record: dict) -> dict:
    for key in ("profileSteps", "storySteps", "talentSteps", "guideSteps"):
        for step in record.get(key) or []:
            step["title"] = clean_text(step.get("title", ""))
            step["body"] = clean_text(step.get("body", ""))
    role = infer_role(record.get("talentSteps") or [])
    record["role"] = role
    for step in record.get("profileSteps") or []:
        if step.get("id") == "overview":
            step["body"] = (
                f"{record['name']} — {record['rarity']}★, {record['elementLabel']}, "
                f"{record['weaponLabel']}. Регион: {record['regionLabel']}. "
                f"Роль: {role.lower()}."
            )
    for step in record.get("storySteps") or []:
        if step.get("id") != "combat-identity":
            continue
        sentence = f"Боевая роль по описанию талантов: {role.lower()}."
        if "Боевая роль по описанию талантов:" in step["body"]:
            step["body"] = re.sub(
                r"Боевая роль по описанию талантов: [^.]+.",
                sentence,
                step["body"],
            )
        else:
            step["body"] = step["body"].rstrip(".") + ". " + sentence
    for step in record.get("guideSteps") or []:
        if step.get("id") == "role":
            step["body"] = (
                f"{record['name']} в бою закрывает роль: {role.lower()}. "
                f"Стихия — {record['elementLabel']}, оружие — {record['weaponLabel']}. "
                f"Параметр возвышения — {record['ascensionStat']}."
            )
        if step.get("id") == "weapon":
            step["body"] = weapon_guide_body(
                record["weapon"],
                record["weaponLabel"],
                record["ascensionStat"],
            )
    icon = next((image for image in record.get("images") or [] if image.get("id") == "icon"), None)
    suffix = avatar_icon_suffix(icon["url"]) if icon else ""
    card_url = namecard_url(f"UI_AvatarIcon_{suffix}") if suffix else None
    kept = [image for image in record.get("images") or [] if image.get("id") != "namecard"]
    previous_card = next(
        (image for image in record.get("images") or [] if image.get("id") == "namecard"),
        None,
    )
    if card_url:
        kept.append(
            {
                "id": "namecard",
                "alt": (previous_card or {}).get("alt") or f"Именная карта: {record['name']}",
                "url": card_url,
            }
        )
    record["images"] = kept
    return record


def repair_existing_files() -> None:
    count = 0
    for path in sorted(OUT_DIR.glob("*.md")):
        record = repair_record(parse_existing_markdown(path.read_text(encoding="utf-8")))
        path.write_text(render_md(record), encoding="utf-8")
        count += 1
    print(f"repaired {count} files")



def main() -> None:
    if "--repair" in sys.argv:
        repair_existing_files()
        return

    listing = load_json(LIST_PATH)["data"]["items"]
    fandom_names = [line.strip() for line in FANDOM_PATH.read_text(encoding="utf-8").splitlines() if line.strip() and not line[0].isdigit()]
    if fandom_names and fandom_names[0] == "120":
        fandom_names = fandom_names[1:]
    fandom_index = {normalize(name): name for name in fandom_names}

    grouped: dict[str, list[tuple[str, dict]]] = {}
    for file_path in sorted(YATTA_DIR.glob("*.json")):
        payload = load_json(file_path)
        data = payload["data"]
        route = data.get("route") or ""
        if "Traveler Girl" in route:
            continue
        if route == "Manekina":
            continue
        if "Traveler Boy" in route:
            key = "Traveler"
        elif route in {"Manekin", "Manekina"}:
            key = "Wonderland Manekin"
        else:
            key = route
        grouped.setdefault(key, []).append((file_path.stem, data))

    records: list[dict] = []
    unmatched: list[str] = []
    for key, bundle in grouped.items():
        bundle.sort(key=lambda item: item[0])
        if key == "Traveler":
            primary = bundle[0][1]
            extra: list[dict] = []
            for _stem, data in bundle:
                element_label = ELEMENT.get(data.get("element") or "None", ("adaptive", "Адаптивный"))[1]
                for talent in talent_items(data):
                    extra.append(
                        {
                            **talent,
                            "id": f"{data['element']}-{talent['id']}",
                            "name": f"{element_label}: {talent['name']}",
                        }
                    )
            record = record_from_data(primary, "Traveler", extra_talents=extra)
            record["name"] = "Путешественник"
            record["shortName"] = "Путешественник"
            record["element"] = "adaptive"
            record["elementLabel"] = "Адаптивный"
            record["storySteps"][0]["title"] = "Кто такой Путешественник"
            record["storySteps"][0]["body"] = clean_text(primary["fetter"].get("detail"))
            records.append(record)
            continue
        if key == "Wonderland Manekin":
            record = record_from_data(bundle[0][1], "Wonderland Manekin")
            record["name"] = "Манекен Чудесного края"
            record["shortName"] = "Манекен"
            records.append(record)
            continue
        data = bundle[0][1]
        fandom_name = fandom_index.get(normalize(key))
        if not fandom_name:
            fandom_name = fandom_index.get(normalize(data["name"]))
        if not fandom_name:
            unmatched.append(key)
            fandom_name = key
        records.append(record_from_data(data, fandom_name))

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for old in OUT_DIR.glob("*.md"):
        old.unlink()

    for record in records:
        (OUT_DIR / f"{record['slug']}.md").write_text(render_md(record), encoding="utf-8")

    fandom_set = set(fandom_names)
    got = {record["nameEn"] for record in records}
    missing = sorted(fandom_set - got)
    extra = sorted(got - fandom_set)

    lines = [
        "# Ростер играбельных персонажей",
        "",
        "Сверка на 19 сентября 2026.",
        "",
        "Канонический список: [Character/List](https://genshin-impact.fandom.com/wiki/Character/List) — **120** играбельных.",
        "Карточки талантов и историй: официальные строки архива через [Yatta](https://gi.yatta.moe) (дамп клиента HoYoverse).",
        "",
        f"Файлов в `research/characters`: **{len(records)}**.",
        "",
        "## Сверка",
        "",
        f"- Fandom playable: {len(fandom_set)}",
        f"- Файлов исследований: {len(records)}",
        f"- Нет файла: {', '.join(missing) if missing else 'нет'}",
        f"- Лишние файлы: {', '.join(extra) if extra else 'нет'}",
        f"- Не сопоставлены с Fandom на этапе сборки: {', '.join(unmatched) if unmatched else 'нет'}",
        "",
        "## Список",
        "",
        "| Файл | Имя | Стихия | Оружие | Редкость | Регион |",
        "| --- | --- | --- | --- | --- | --- |",
    ]
    for record in sorted(records, key=lambda item: item["nameEn"]):
        lines.append(
            f"| `{record['slug']}.md` | {record['name']} ({record['nameEn']}) | {record['elementLabel']} | {record['weaponLabel']} | {record['rarity']} | {record['regionLabel']} |"
        )
    ROSTER_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"wrote {len(records)} files")
    print("missing", missing)
    print("extra", extra)
    print("unmatched", unmatched)


if __name__ == "__main__":
    main()
