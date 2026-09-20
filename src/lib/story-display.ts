import type { CharacterImage, CharacterStep } from "./character";

const SKIP_STORY_IDS = new Set([
  "combat-identity",
  "origin",
  "look",
  "appearance",
]);

const SAFE_ART = ["wish", "portrait", "namecard", "idle", "vision", "splash", "icon"];

export type StoryLayout = "lead" | "split" | "flip" | "plate" | "inset";

export type StoryArtKind = "icon" | "wide" | "clip" | "portrait";

export type StoryChapterView = {
  step: CharacterStep;
  art?: CharacterImage;
  layout: StoryLayout;
  kind?: StoryArtKind;
  kicker: string;
};

export const cleanLore = (text: string): string => {
  const cleaned = text
    .replace(/<[^>]+>/g, "")
    .replace(/#/g, "")
    .replace(/\{\{|\}\}/g, "")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/^Именная карта\.\s*/i, "")
    .replace(/([а-яё])([А-ЯЁ])/g, "$1. $2")
    .replace(/([.!?])([А-ЯЁ])/g, "$1 $2")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return cleaned;
};

export const storyChaptersOf = (steps: CharacterStep[]): CharacterStep[] => {
  const chapters: CharacterStep[] = [];
  for (const step of steps) {
    if (!SKIP_STORY_IDS.has(step.id)) {
      chapters.push({
        ...step,
        title: titleFor(step),
        body: cleanLore(step.body),
      });
    }
  }
  return mergeWhoAndOfficial(chapters);
};

const titleFor = (step: CharacterStep): string => {
  if (step.id === "introduction") {
    return "История";
  }
  if (step.id === "official-site") {
    return "Кто это";
  }
  return step.title;
};

const kickerFor = (_step: CharacterStep, index: number): string =>
  `Глава ${index + 1}`;

const mergeWhoAndOfficial = (steps: CharacterStep[]): CharacterStep[] => {
  const who = steps.find((step) => step.id === "who");
  const official = steps.find((step) => step.id === "official-site");
  const rest = steps.filter(
    (step) => step.id !== "who" && step.id !== "official-site",
  );
  if (who) {
    return [who, ...rest];
  }
  if (official) {
    return [official, ...rest];
  }
  return rest;
};

const isLocal = (image: CharacterImage): boolean => image.url.startsWith("/media/");

const isEnglishDump = (image: CharacterImage): boolean => {
  const mark = `${image.id} ${image.alt} ${image.url}`.toLowerCase();
  return (
    mark.includes("details") ||
    mark.includes("intro-card") ||
    mark.includes("intro-banner") ||
    mark.includes("introduction_card") ||
    mark.includes("introduction_banner") ||
    mark.includes("voice-over") ||
    mark.includes("hearsay") ||
    mark.includes("talent_details")
  );
};

const isSafeArt = (image: CharacterImage): boolean => {
  if (!isLocal(image) || isEnglishDump(image)) {
    return false;
  }
  return SAFE_ART.some((prefix) => image.id === prefix || image.id.startsWith(`${prefix}-`));
};

const localOf = (arts: CharacterImage[]): CharacterImage[] => {
  const local: CharacterImage[] = [];
  for (const art of arts) {
    if (isSafeArt(art)) {
      local.push(art);
    }
  }
  return local;
};

const byPrefix = (arts: CharacterImage[], prefix: string): CharacterImage[] => {
  const matched: CharacterImage[] = [];
  for (const art of arts) {
    if (art.id === prefix || art.id.startsWith(`${prefix}-`)) {
      matched.push(art);
    }
  }
  return matched;
};

const artKind = (art: CharacterImage): StoryArtKind => {
  if (art.id.startsWith("vision") || art.id === "icon") {
    return "icon";
  }
  if (art.id.startsWith("namecard") || art.id === "splash" || art.id.startsWith("wish")) {
    return "wide";
  }
  if (
    art.url.endsWith(".gif") ||
    art.url.endsWith(".webp") ||
    art.url.endsWith(".mp4")
  ) {
    return "clip";
  }
  return "portrait";
};

const layoutFor = (
  step: CharacterStep,
  index: number,
  art: CharacterImage | undefined,
): StoryLayout => {
  if (step.id === "namecard") {
    return "plate";
  }
  if (art && artKind(art) === "icon") {
    return "inset";
  }
  if (index === 0 || !art) {
    return "lead";
  }
  if (artKind(art) === "wide") {
    return "plate";
  }
  return index % 2 === 0 ? "flip" : "split";
};

const takeUnused = (
  candidates: CharacterImage[],
  used: Set<string>,
): CharacterImage | undefined => {
  for (const item of candidates) {
    if (!used.has(item.url)) {
      used.add(item.url);
      return item;
    }
  }
  return undefined;
};

export const artForChapter = (
  arts: CharacterImage[],
  fallback: CharacterImage[],
  index: number,
  stepId: string,
): CharacterImage | undefined => {
  const pool = localOf([...arts, ...fallback]);
  if (stepId === "namecard") {
    return byPrefix(pool, "namecard")[0];
  }
  if (index === 0) {
    return (
      byPrefix(pool, "wish")[0] ??
      byPrefix(pool, "splash")[0] ??
      byPrefix(pool, "portrait")[0] ??
      pool[0]
    );
  }
  if (pool.length === 0) {
    return undefined;
  }
  return pool[index % pool.length];
};

export const storyViewsOf = (
  steps: CharacterStep[],
  arts: CharacterImage[],
  fallback: CharacterImage[],
): StoryChapterView[] => {
  const chapters = storyChaptersOf(steps);
  const pool = localOf([...arts, ...fallback]);
  const used = new Set<string>();

  return chapters.map((step, index) => {
    const preferred: CharacterImage[] = [];
    if (step.id === "namecard") {
      preferred.push(...byPrefix(pool, "namecard"));
    } else if (index === 0) {
      preferred.push(
        ...byPrefix(pool, "wish"),
        ...byPrefix(pool, "splash"),
        ...byPrefix(pool, "portrait"),
      );
    } else if (step.id === "introduction") {
      preferred.push(...byPrefix(pool, "portrait"), ...byPrefix(pool, "wish"));
    } else if (step.id === "personality") {
      preferred.push(...byPrefix(pool, "idle"), ...byPrefix(pool, "portrait"));
    } else {
      preferred.push(...pool);
    }
    const art = takeUnused(preferred.length > 0 ? preferred : pool, used);
    return {
      step,
      art,
      layout: layoutFor(step, index, art),
      kind: art ? artKind(art) : undefined,
      kicker: kickerFor(step, index),
    };
  });
};
