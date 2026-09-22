import { describe, expect, it } from "vitest";
import { filterCharacters, findCharacterBySlug } from "./filter-characters";
import { loadResearchCharacters } from "./load-research-characters";
import { parseCharacterMarkdown } from "./parse-character";
import { describeSource } from "./source-display";
import { cleanLore, storyChaptersOf, storyViewsOf } from "./story-display";
import { summarizeTalent } from "./talent-display";
import {
  clampStepIndex,
  nextStepIndex,
  previousStepIndex,
  stepsForSection,
} from "./step-navigation";

const characters = loadResearchCharacters();

describe("загрузка исследований персонажей", () => {
  it("читает все markdown-файлы исследований и получает полный ростер", () => {
    expect(characters.length).toBe(120);
  });

  it("парсит JSON-шапку реального файла, а не копию данных в тесте", () => {
    const ayaka = findCharacterBySlug(characters, "kamisato-ayaka");
    expect(ayaka).toBeDefined();
    if (!ayaka) {
      return;
    }
    expect(ayaka.name).toContain("Аяка");
    expect(ayaka.element).toBe("cryo");
    expect(ayaka.images.length).toBeGreaterThan(0);
    expect(ayaka.images[0]?.url.startsWith("/media/")).toBe(true);
  });

  it("отклоняет файл без шапки", () => {
    expect(() => parseCharacterMarkdown("# Пусто")).toThrow(
      /нет JSON-шапки/,
    );
  });
});

describe("фильтры витрины на реальных данных", () => {
  it("фильтр по стихии оставляет только выбранную стихию", () => {
    const pyro = filterCharacters(characters, { element: "pyro" });
    expect(pyro.length).toBeGreaterThan(0);
    expect(pyro.length).toBeLessThan(characters.length);
    for (const character of pyro) {
      expect(character.element).toBe("pyro");
    }
  });

  it("фильтр по оружию оставляет только выбранный тип", () => {
    const bows = filterCharacters(characters, { weapon: "bow" });
    expect(bows.length).toBeGreaterThan(0);
    for (const character of bows) {
      expect(character.weapon).toBe("bow");
    }
  });

  it("фильтр по редкости оставляет только выбранную редкость", () => {
    const five = filterCharacters(characters, { rarity: 5 });
    const four = filterCharacters(characters, { rarity: 4 });
    expect(five.length).toBeGreaterThan(0);
    expect(four.length).toBeGreaterThan(0);
    expect(five.length + four.length).toBe(characters.length);
    for (const character of five) {
      expect(character.rarity).toBe(5);
    }
  });

  it("фильтр по региону оставляет только выбранный регион", () => {
    const inazuma = filterCharacters(characters, { region: "inazuma" });
    expect(inazuma.length).toBeGreaterThan(0);
    for (const character of inazuma) {
      expect(character.region).toBe("inazuma");
    }
  });

  it("фильтр по статусу оставляет только архонтов из исследований", () => {
    const archons = filterCharacters(characters, { archon: true });
    expect(archons.map((character) => character.slug).sort()).toEqual([
      "furina",
      "mavuika",
      "nahida",
      "raiden-shogun",
      "venti",
      "zhongli",
    ]);
    for (const character of archons) {
      expect(character.archon).toBe(true);
    }
  });

  it("поиск по имени находит персонажа из исследований", () => {
    const found = filterCharacters(characters, { query: "чжун" });
    expect(found.some((character) => character.slug === "zhongli")).toBe(true);
  });
});

describe("шаги раздела и гайда", () => {
  it("у персонажа из данных есть шаги раздела, гайда и картинки", () => {
    const character = findCharacterBySlug(characters, "nahida");
    expect(character).toBeDefined();
    if (!character) {
      return;
    }
    expect(character.profileSteps.length).toBeGreaterThanOrEqual(2);
    expect(character.storySteps.length).toBeGreaterThanOrEqual(2);
    expect(character.guideSteps.length).toBeGreaterThanOrEqual(2);
    expect(character.talentSteps.length).toBeGreaterThanOrEqual(2);
    for (const step of [...character.profileSteps, ...character.guideSteps]) {
      expect(step.title.trim().length).toBeGreaterThan(0);
      expect(step.body.trim().length).toBeGreaterThan(0);
    }
    expect(character.images.length).toBeGreaterThan(0);
    for (const image of character.images) {
      expect(image.url.trim().length).toBeGreaterThan(0);
      expect(image.alt.trim().length).toBeGreaterThan(0);
    }
  });

  it("навигация шагов не выходит за границы списка", () => {
    const character = characters[0];
    expect(character).toBeDefined();
    if (!character) {
      return;
    }
    const story = stepsForSection(character, "story");
    expect(story.length).toBeGreaterThanOrEqual(2);
    expect(nextStepIndex(0, story.length)).toBe(1);
    expect(previousStepIndex(0, story.length)).toBe(0);
    expect(clampStepIndex(99, story.length)).toBe(story.length - 1);
  });

  it("в шагах исследований нет вики-заголовков и html-курсива", () => {
    for (const character of characters) {
      const steps = [
        ...character.profileSteps,
        ...character.storySteps,
        ...character.talentSteps,
        ...character.guideSteps,
      ];
      for (const step of steps) {
        expect(step.body).not.toMatch(/===/);
        expect(step.body).not.toMatch(/<\/?i>/i);
      }
    }
  });

  it("текст шага про оружие совпадает с типом оружия записи", () => {
    for (const character of characters) {
      const weaponStep = character.guideSteps.find((step) => step.id === "weapon");
      expect(weaponStep).toBeDefined();
      if (!weaponStep) {
        continue;
      }
      expect(weaponStep.body).toContain(`Нужен тип: ${character.weaponLabel}`);
      expect(weaponStep.body).not.toContain("клинки и катализаторы");
    }
  });

  it("известные персонажи основного урона не записаны лекарями", () => {
    const dpsSlugs = [
      "hu-tao",
      "arataki-itto",
      "neuvillette",
      "arlecchino",
      "ganyu",
      "xiao",
      "yoimiya",
      "kamisato-ayaka",
    ];
    for (const slug of dpsSlugs) {
      const character = findCharacterBySlug(characters, slug);
      expect(character).toBeDefined();
      if (!character) {
        continue;
      }
      expect(character.role).not.toMatch(/Лекарь/);
    }
    const barbara = findCharacterBySlug(characters, "barbara");
    expect(barbara?.role).toBe("Лекарь");
    const zhongli = findCharacterBySlug(characters, "zhongli");
    expect(zhongli?.role).toBe("Защита");
  });

  it("роль в обзоре и в шаге боя совпадает с полем role", () => {
    for (const character of characters) {
      const overview = character.profileSteps.find((step) => step.id === "overview");
      const combat = character.storySteps.find(
        (step) => step.id === "combat-identity",
      );
      expect(overview).toBeDefined();
      if (overview) {
        expect(overview.body.toLowerCase()).toContain(character.role.toLowerCase());
      }
      if (combat) {
        expect(combat.body.toLowerCase()).toContain(character.role.toLowerCase());
      }
    }
  });

  it("подписывает источники понятным типом ссылки", () => {
    const card = describeSource({
      title: "Genshin Impact Вики — Аяка/Лор",
      url: "https://genshin-impact.fandom.com/ru/wiki/Аяка/Лор",
    });
    expect(card.kind).toBe("Лор");
    expect(card.hint.length).toBeGreaterThan(10);
    expect(card.host).toContain("fandom.com");
    expect(card.action).toContain("лор");
  });

  it("история на карточке не тащит служебные шаги боя", () => {
    const ayaka = findCharacterBySlug(characters, "kamisato-ayaka");
    expect(ayaka).toBeDefined();
    if (!ayaka) {
      return;
    }
    const chapters = storyChaptersOf(ayaka.storySteps);
    expect(chapters.some((step) => step.id === "combat-identity")).toBe(false);
    expect(chapters.some((step) => step.id === "look")).toBe(false);
    expect(chapters.some((step) => step.id === "appearance")).toBe(false);
    expect(chapters.length).toBeGreaterThan(0);
    expect(ayaka.storyArt.length).toBeGreaterThan(0);
  });

  it("у Аяки есть превью навыка из исследований", () => {
    const ayaka = findCharacterBySlug(characters, "kamisato-ayaka");
    expect(ayaka).toBeDefined();
    if (!ayaka) {
      return;
    }
    const localPreview = ayaka.talentSteps.find((step) =>
      step.previewGif?.startsWith("/media/"),
    );
    expect(localPreview?.previewGif).toMatch(/^\/media\//);
    expect(ayaka.images[0]?.url).toMatch(/^\/media\//);
    const weapon = ayaka.guideSteps.find((step) => step.id === "weapon");
    expect(weapon?.body).toContain("Нужен тип:");
    expect(ayaka.videos[0]?.youtubeId).toBe("5RCsr1Y8UZA");
    const icon = ayaka.talentSteps.find((step) => step.iconUrl);
    expect(icon?.iconUrl).toMatch(/^\/media\//);
  });

  it("все картинки персонажей лежат локально, без внешних ссылок", () => {
    for (const character of characters) {
      for (const image of [...character.images, ...character.storyArt]) {
        expect(image.url.startsWith("/media/")).toBe(true);
      }
      for (const step of character.talentSteps) {
        if (step.iconUrl) {
          expect(step.iconUrl.startsWith("/media/")).toBe(true);
        }
        if (step.previewGif) {
          expect(step.previewGif.startsWith("/media/")).toBe(true);
        }
        if (step.previewVideo) {
          expect(step.previewVideo.startsWith("/media/")).toBe(true);
          expect(step.previewVideo.endsWith(".mp4")).toBe(true);
        }
      }
    }
  });

  it("раскладывает историю по макетам и локальным картинкам", () => {
    const ayaka = findCharacterBySlug(characters, "kamisato-ayaka");
    expect(ayaka).toBeDefined();
    if (!ayaka) {
      return;
    }
    const views = storyViewsOf(ayaka.storySteps, ayaka.storyArt, ayaka.images);
    expect(views.length).toBeGreaterThan(2);
    expect(views[0]?.layout).toBe("lead");
    expect(views.some((view) => view.step.id === "look")).toBe(false);
    for (const view of views) {
      if (view.art) {
        expect(view.art.url).toMatch(/^\/media\//);
        expect(view.art.id).not.toMatch(/details|intro-card|intro-banner/i);
      }
    }
  });

  it("чистит лор и не оставляет английские промо-экраны", () => {
    expect(cleanLore("глубинах.Никто не ведает")).toBe("глубинах. Никто не ведает");
    const skirk = findCharacterBySlug(characters, "skirk");
    expect(skirk).toBeDefined();
    if (!skirk) {
      return;
    }
    const views = storyViewsOf(skirk.storySteps, skirk.storyArt, skirk.images);
    expect(views.some((view) => view.step.title === "Как выглядит в архиве")).toBe(
      false,
    );
    for (const view of views) {
      expect(view.kicker).not.toMatch(/NaN/i);
      if (view.art) {
        expect(view.art.id).not.toMatch(/details/);
      }
    }
  });

  it("краткое описание таланта берёт первый абзац, а не весь текст", () => {
    const longBody = `${"Навык создаёт поле.\n\n"}${"Подробности урона. ".repeat(40)}`;
    const summary = summarizeTalent(longBody);
    expect(summary).toContain("Навык создаёт поле");
    expect(summary.length).toBeLessThan(longBody.length);
  });

  it("именные карты не повторяют URL портрета", () => {
    for (const character of characters) {
      const icon = character.images.find((image) => image.id === "icon");
      const namecard = character.images.find((image) => image.id === "namecard");
      if (icon && namecard) {
        expect(namecard.url).not.toBe(icon.url);
      }
    }
  });
});
