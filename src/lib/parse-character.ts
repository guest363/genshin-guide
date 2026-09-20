import type {
  CharacterImage,
  CharacterRecord,
  CharacterSource,
  CharacterStep,
  CharacterVideo,
  ElementId,
  RegionId,
  WeaponId,
} from "./character";
import { withBase } from "./with-base";

const ELEMENTS = new Set<ElementId>([
  "anemo",
  "geo",
  "electro",
  "dendro",
  "hydro",
  "pyro",
  "cryo",
  "adaptive",
]);

const WEAPONS = new Set<WeaponId>([
  "sword",
  "claymore",
  "polearm",
  "bow",
  "catalyst",
]);

const REGIONS = new Set<RegionId>([
  "mondstadt",
  "liyue",
  "inazuma",
  "sumeru",
  "fontaine",
  "natlan",
  "nod-krai",
  "snezhnaya",
  "none",
]);

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const cleanStepText = (value: string): string =>
  value
    .replace(/<[^>]+>/g, "")
    .replace(/\{\{|\}\}/g, "")
    .replace(/^=+\s*[^=\n]+?\s*=+\s*/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const isLocalOrRemoteMedia = (value: string): boolean =>
  value.startsWith("/media/") || value.startsWith("https://");

const readString = (value: unknown, field: string): string => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Поле ${field} должно быть непустой строкой`);
  }
  return value;
};

const readSteps = (value: unknown, field: string): CharacterStep[] => {
  if (!Array.isArray(value)) {
    throw new Error(`Поле ${field} должно быть списком шагов`);
  }
  const steps: CharacterStep[] = [];
  for (const item of value) {
    if (!isObject(item)) {
      throw new Error(`Шаг в ${field} должен быть объектом`);
    }
    const step: CharacterStep = {
      id: readString(item.id, `${field}.id`),
      title: cleanStepText(readString(item.title, `${field}.title`)),
      body: cleanStepText(readString(item.body, `${field}.body`)),
    };
    if (typeof item.iconUrl === "string" && isLocalOrRemoteMedia(item.iconUrl)) {
      step.iconUrl = withBase(item.iconUrl);
    }
    if (
      typeof item.previewGif === "string" &&
      isLocalOrRemoteMedia(item.previewGif)
    ) {
      step.previewGif = withBase(item.previewGif);
    }
    if (
      typeof item.previewVideo === "string" &&
      isLocalOrRemoteMedia(item.previewVideo)
    ) {
      step.previewVideo = withBase(item.previewVideo);
    }
    if (
      typeof item.previewPoster === "string" &&
      isLocalOrRemoteMedia(item.previewPoster)
    ) {
      step.previewPoster = withBase(item.previewPoster);
    }
    steps.push(step);
  }
  return steps;
};

const readImages = (value: unknown): CharacterImage[] => {
  if (!Array.isArray(value)) {
    throw new Error("Поле images должно быть списком");
  }
  const images: CharacterImage[] = [];
  for (const item of value) {
    if (!isObject(item)) {
      throw new Error("Картинка должна быть объектом");
    }
    images.push({
      id: readString(item.id, "images.id"),
      alt: readString(item.alt, "images.alt"),
      url: withBase(readString(item.url, "images.url")),
    });
  }
  return images;
};

const readVideos = (value: unknown): CharacterVideo[] => {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new Error("Поле videos должно быть списком");
  }
  const videos: CharacterVideo[] = [];
  for (const item of value) {
    if (!isObject(item)) {
      throw new Error("Видео должно быть объектом");
    }
    videos.push({
      title: readString(item.title, "videos.title"),
      youtubeId: readString(item.youtubeId, "videos.youtubeId"),
    });
  }
  return videos;
};

const readSources = (value: unknown): CharacterSource[] => {
  if (!Array.isArray(value)) {
    throw new Error("Поле sources должно быть списком");
  }
  const sources: CharacterSource[] = [];
  for (const item of value) {
    if (!isObject(item)) {
      throw new Error("Источник должен быть объектом");
    }
    sources.push({
      title: readString(item.title, "sources.title"),
      url: readString(item.url, "sources.url"),
    });
  }
  return sources;
};

const readStats = (value: unknown): Record<string, string> => {
  if (value === undefined) {
    return {};
  }
  if (!isObject(value)) {
    throw new Error("Поле baseStats должно быть объектом");
  }
  const stats: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string" || typeof entry === "number") {
      stats[key] = String(entry);
    }
  }
  return stats;
};

export const parseCharacterMarkdown = (raw: string): CharacterRecord => {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("---")) {
    throw new Error("В файле исследования нет JSON-шапки");
  }
  const afterOpen = trimmed.slice(3).replace(/^\s*/, "");
  const closeIndex = afterOpen.indexOf("\n---");
  if (closeIndex < 0) {
    throw new Error("JSON-шапка не закрыта");
  }
  const jsonText = afterOpen.slice(0, closeIndex).trim();
  const parsed: unknown = JSON.parse(jsonText);
  if (!isObject(parsed)) {
    throw new Error("JSON-шапка должна быть объектом");
  }

  const element = readString(parsed.element, "element");
  if (!ELEMENTS.has(element as ElementId)) {
    throw new Error(`Неизвестная стихия: ${element}`);
  }
  const weapon = readString(parsed.weapon, "weapon");
  if (!WEAPONS.has(weapon as WeaponId)) {
    throw new Error(`Неизвестное оружие: ${weapon}`);
  }
  const region = readString(parsed.region, "region");
  if (!REGIONS.has(region as RegionId)) {
    throw new Error(`Неизвестный регион: ${region}`);
  }
  const rarity = parsed.rarity;
  if (rarity !== 4 && rarity !== 5) {
    throw new Error("Редкость должна быть 4 или 5");
  }

  return {
    id: readString(parsed.id, "id"),
    slug: readString(parsed.slug, "slug"),
    name: readString(parsed.name, "name"),
    shortName: readString(parsed.shortName, "shortName"),
    nameEn: readString(parsed.nameEn, "nameEn"),
    title: readString(parsed.title, "title"),
    rarity,
    element: element as ElementId,
    elementLabel: readString(parsed.elementLabel, "elementLabel"),
    weapon: weapon as WeaponId,
    weaponLabel: readString(parsed.weaponLabel, "weaponLabel"),
    region: region as RegionId,
    regionLabel: readString(parsed.regionLabel, "regionLabel"),
    role: readString(parsed.role, "role"),
    birthday: readString(parsed.birthday, "birthday"),
    constellation: readString(parsed.constellation, "constellation"),
    affiliation: readString(parsed.affiliation, "affiliation"),
    baseStats: readStats(parsed.baseStats),
    ascensionStat: readString(parsed.ascensionStat, "ascensionStat"),
    images: readImages(parsed.images),
    storyArt: parsed.storyArt === undefined ? [] : readImages(parsed.storyArt),
    profileSteps: readSteps(parsed.profileSteps, "profileSteps"),
    storySteps: readSteps(parsed.storySteps, "storySteps"),
    talentSteps: readSteps(parsed.talentSteps, "talentSteps"),
    guideSteps: readSteps(parsed.guideSteps, "guideSteps"),
    videos: readVideos(parsed.videos),
    sources: readSources(parsed.sources),
  };
};
