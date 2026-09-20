import type { ElementId } from "./character";

export type ReactionElement = Exclude<ElementId, "adaptive">;

export const REACTION_ELEMENTS: ReactionElement[] = [
  "pyro",
  "hydro",
  "anemo",
  "electro",
  "dendro",
  "cryo",
  "geo",
];

export const ELEMENT_LABELS: Record<ReactionElement, string> = {
  pyro: "Пиро",
  hydro: "Гидро",
  anemo: "Анемо",
  electro: "Электро",
  dendro: "Дендро",
  cryo: "Крио",
  geo: "Гео",
};

// Names follow the Russian game client (verified against the talent dumps
// in research/characters: «Пар», «Заряжен», «Бутонизация», «Вегетация»…
// and the 6.x families: «Лунный заряд», «Лунная бутонизация», «Лунный
// кристалл», «Гармония Лунной пелены», «Звёздный проводник»,
// «Звёздное рассеивание»).

export const MAX_CORES = 5;

// Что висит на самом сгустке. В «Заряжен» обе ауры — Гидро и Электро —
// сосуществуют (ec хранит вторую), подо льдом и в пробуждении аура одна.
export type AuraState = {
  aura: ReactionElement | null;
  ec: ReactionElement | null;
  frozen: boolean;
  quicken: boolean;
  burning: boolean;
  cores: number;
  dew: number;
};

export const EMPTY_STATE: AuraState = {
  aura: null,
  ec: null,
  frozen: false,
  quicken: false,
  burning: false,
  cores: 0,
  dew: 0,
};

// Конструкты на поле боя, не на сгустке: туча «Лунного заряда», Лунные
// пелены, призма «Предела путеводной звезды» и Звёздный вихрь.
export type FieldState = {
  cloud: boolean;
  veils: number;
  veilCount: number;
  prism: boolean;
  vortex: 0 | 1 | 2;
  vortexCount: number;
};

export const EMPTY_FIELD: FieldState = {
  cloud: false,
  veils: 0,
  veilCount: 0,
  prism: false,
  vortex: 0,
  vortexCount: 0,
};

// Лунные реакции включаются пассивками «Лунного знамения» (Нод-Край),
// звёздные — пассивками «Звёздного блеска»; оба знака могут стоять сразу.
export type LabFlags = {
  lunar: boolean;
  stellar: boolean;
};

export const NO_FLAGS: LabFlags = { lunar: false, stellar: false };

export type ReactionResult = {
  code: string;
  name: string;
  elements: ReactionElement[];
  accent: string;
  note: string;
  residue?: string;
};

export type ApplyOutcome = {
  target: AuraState;
  field: FieldState;
  reaction: ReactionResult | null;
  applied: boolean;
};

const PAIRS: Record<string, ReactionResult> = {
  "hydro+pyro": {
    code: "vaporize",
    name: "Пар",
    elements: ["pyro", "hydro"],
    accent: "var(--hydro)",
    note: "усиление урона",
    residue: "аура-жертва израсходована",
  },
  "cryo+pyro": {
    code: "melt",
    name: "Таяние",
    elements: ["pyro", "cryo"],
    accent: "var(--pyro)",
    note: "усиление урона",
    residue: "аура-жертва израсходована",
  },
  "electro+pyro": {
    code: "overloaded",
    name: "Перегрузка",
    elements: ["pyro", "electro"],
    accent: "var(--pyro)",
    note: "взрыв Пиро по площади",
    residue: "ауры сброшены",
  },
  "electro+hydro": {
    code: "electro-charged",
    name: "Заряжен",
    elements: ["hydro", "electro"],
    accent: "var(--electro)",
    note: "разряд бьёт цепью по соседям",
    residue: "обе ауры остаются — разряд тикает",
  },
  "cryo+hydro": {
    code: "freeze",
    name: "Заморозка",
    elements: ["hydro", "cryo"],
    accent: "var(--cryo)",
    note: "цель скована льдом",
    residue: "лёд; Гидро и Крио продлевают его",
  },
  "cryo+electro": {
    code: "superconduct",
    name: "Сверхпроводник",
    elements: ["cryo", "electro"],
    accent: "var(--electro)",
    note: "снижает физическое сопротивление",
    residue: "ауры сброшены",
  },
  "dendro+pyro": {
    code: "burning",
    name: "Горение",
    elements: ["pyro", "dendro"],
    accent: "var(--pyro)",
    note: "непрерывный урон Пиро",
    residue: "Пиро-аура и огонь, пока горит Дендро",
  },
  "dendro+hydro": {
    code: "bloom",
    name: "Цветение",
    elements: ["hydro", "dendro"],
    accent: "var(--dendro)",
    note: "рождается ядро цветения",
    residue: `ядра: до ${MAX_CORES}; сверх — старейшее взрывается`,
  },
  "dendro+electro": {
    code: "quicken",
    name: "Стимуляция",
    elements: ["dendro", "electro"],
    accent: "var(--dendro)",
    note: "цель пробуждена к Обострению и Разрастанию",
    residue: "пробуждение держится на цели",
  },
};

const isSpreadable = (element: ReactionElement): boolean =>
  element === "pyro" ||
  element === "hydro" ||
  element === "electro" ||
  element === "cryo";

// Anemo and Geo are trigger-only: they never linger as an aura (matches the
// game), so a pair always resolves with the other element as the spread one.
const pairResult = (
  a: ReactionElement,
  b: ReactionElement,
): ReactionResult | undefined => {
  if (a === b) {
    return undefined;
  }
  const key = [a, b].sort().join("+");
  if (PAIRS[key]) {
    return PAIRS[key];
  }
  const swirled = (element: ReactionElement): ReactionResult => ({
    code: `swirl:${element}`,
    name: `Рассеивание · ${ELEMENT_LABELS[element]}`,
    elements: ["anemo", element],
    accent: "var(--anemo)",
    note: `стихия ${ELEMENT_LABELS[element]} разнесена по площади`,
    residue: "аура остаётся, стихия оседает на соседях",
  });
  const crystal = (element: ReactionElement): ReactionResult => ({
    code: `crystallize:${element}`,
    name: `Кристаллизация · ${ELEMENT_LABELS[element]}`,
    elements: ["geo", element],
    accent: "var(--geo)",
    note: `получен кристалл-щит: ${ELEMENT_LABELS[element]}`,
    residue: "аура остаётся, щит — на подбор",
  });
  if (a === "anemo") {
    return isSpreadable(b) ? swirled(b) : undefined;
  }
  if (b === "anemo") {
    return isSpreadable(a) ? swirled(a) : undefined;
  }
  if (a === "geo") {
    return isSpreadable(b) ? crystal(b) : undefined;
  }
  if (b === "geo") {
    return isSpreadable(a) ? crystal(a) : undefined;
  }
  return undefined;
};

// Множитель усиливающих реакций зависит от того, кто бьёт последним:
// Пиро-триггер сжигает вдвое, ответная стихия — в полтора раза.
const amplifyNote = (code: string, incoming: ReactionElement): string => {
  const forward = incoming === "pyro";
  const times = forward ? "×2" : "×1,5";
  if (code === "vaporize") {
    return forward
      ? `усиление ${times}: Пиро испаряет Гидро`
      : `усиление ${times}: Гидро гасит Пиро`;
  }
  return forward
    ? `усиление ${times}: Пиро плавит Крио`
    : `усиление ${times}: Крио остужает Пиро`;
};

const stellarConduct = (): ReactionResult => ({
  code: "stellar-conduct",
  name: "Звёздный проводник",
  elements: ["cryo", "electro"],
  accent: "var(--cryo)",
  note: "призма держит Предел путеводной звезды: бонус Крио и Электро урона",
  residue: "призма — 7 сек; врагам −40% физ. защиты",
});

const stellarSwirl = (
  level: 1 | 2,
  burst: boolean,
  count: number,
): ReactionResult => ({
  code: burst ? "stellar-swirl:burst" : "stellar-swirl",
  name: burst ? "Звёздное рассеивание · взрыв" : "Звёздное рассеивание",
  elements: ["anemo", "cryo"],
  accent: "var(--anemo)",
  note: burst
    ? "шестая активация: вихрь взорвался Крио-уроном"
    : `звёздный вихрь ур.${level} взорвётся Крио-уроном`,
  residue: burst ? "вихрь сброшен — счёт с нуля" : `активаций до взрыва: ${6 - count}`,
});

const lunarCharged = (): ReactionResult => ({
  code: "lunar-charged",
  name: "Лунный заряд",
  elements: ["hydro", "electro"],
  accent: "var(--electro)",
  note: "грозовая туча бьёт молнией мокрых и заряженных",
  residue: "туча — 6 сек; обе ауры остаются",
});

const lunarBloom = (dew: number): ReactionResult => ({
  code: "lunar-bloom",
  name: "Лунная бутонизация",
  elements: ["hydro", "dendro"],
  accent: "var(--dendro)",
  note: "ядро как обычно, и отряд получает Зелёную росу",
  residue: `роза: ${dew}/3 — её тратят особые атаки`,
});

const lunarCrystallize = (harmony: boolean): ReactionResult =>
  harmony
    ? {
        code: "moondrift-harmony",
        name: "Гармония Лунной пелены",
        elements: ["geo", "hydro"],
        accent: "var(--geo)",
        note: "третья активация: пелены пускают залп самонаводящихся снарядов",
        residue: "пелены остаются на поле",
      }
    : {
        code: "lunar-crystallize",
        name: "Лунный кристалл",
        elements: ["geo", "hydro"],
        accent: "var(--geo)",
        note: "рядом возникают три Лунные пелены",
        residue: "каждая третья активация — Гармония",
      };

export const applyElement = (
  target: AuraState,
  field: FieldState,
  incoming: ReactionElement,
  flags: LabFlags = NO_FLAGS,
): ApplyOutcome => {
  const next: AuraState = { ...target };
  const nf: FieldState = { ...field };
  const settle = (
    reaction: ReactionResult | null,
    applied: boolean,
  ): ApplyOutcome => ({
    target: { ...next, burning: next.burning && next.aura === "pyro" },
    field: nf,
    reaction,
    applied,
  });
  const none = (): ApplyOutcome => settle(null, false);

  // Ядра перехватывают Электро и Пиро раньше аур: Вегетация тратит одно
  // ядро за удар, Бутонизация взрывает все ядра в радиусе.
  if (next.cores > 0 && incoming === "electro") {
    next.cores -= 1;
    return {
      target: next,
      field: nf,
      reaction: {
        code: "hyperbloom",
        name: "Вегетация",
        elements: ["hydro", "dendro", "electro"],
        accent: "var(--dendro)",
        note: "побег-стрела бьёт Дендро уроном",
        residue: next.cores > 0 ? `осталось ядер: ${next.cores}` : "ядро потрачено",
      },
      applied: true,
    };
  }
  if (next.cores > 0 && incoming === "pyro") {
    const spent = next.cores;
    next.cores = 0;
    return {
      target: next,
      field: nf,
      reaction: {
        code: "burgeon",
        name: "Бутонизация",
        elements: ["hydro", "dendro", "pyro"],
        accent: "var(--pyro)",
        note: `ядра взорвались уроном Дендро${spent > 1 ? ` — все ${spent} разом` : ""}`,
        residue: "ядра потрачены",
      },
      applied: true,
    };
  }

  // Лёд — отдельная шкала: его снимают только Таяние и «Разбит» (физ.
  // урон). Рассеивание, Кристаллизация и Сверхпроводник лёд держат.
  if (next.frozen) {
    if (incoming === "pyro") {
      next.frozen = false;
      next.aura = null;
      return settle(
        {
          ...PAIRS["cryo+pyro"]!,
          note: amplifyNote("melt", "pyro"),
        },
        true,
      );
    }
    if (incoming === "electro") {
      next.aura = null;
      if (flags.stellar) {
        nf.prism = true;
        return settle(stellarConduct(), true);
      }
      return settle(PAIRS["cryo+electro"]!, true);
    }
    if (incoming === "anemo") {
      next.aura = null;
      if (flags.stellar) {
        const count = nf.vortexCount + 1;
        const burst = count >= 6;
        nf.vortexCount = burst ? 0 : count;
        nf.vortex = burst ? 0 : count >= 3 ? 2 : 1;
        return settle(stellarSwirl(nf.vortex === 2 ? 2 : 1, burst, count), true);
      }
      return settle(
        {
          code: "swirl:cryo",
          name: "Рассеивание · Крио",
          elements: ["anemo", "cryo"],
          accent: "var(--anemo)",
          note: "лёд не тронут: стихия Крио разнесена по площади",
          residue: "цель остаётся во льду",
        },
        true,
      );
    }
    if (incoming === "geo") {
      next.aura = null;
      return settle(
        {
          code: "crystallize:cryo",
          name: "Кристаллизация · Крио",
          elements: ["geo", "cryo"],
          accent: "var(--geo)",
          note: "кристалл-щит со льда",
          residue: "цель остаётся во льду",
        },
        true,
      );
    }
    // Гидро и Крио продлевают лёд, прочее соскальзывает.
    if (incoming === "hydro" || incoming === "cryo") {
      return settle(null, true);
    }
    return none();
  }

  if (next.quicken && (incoming === "electro" || incoming === "dendro")) {
    return settle(
      incoming === "electro"
        ? {
            code: "aggravate",
            name: "Обострение",
            elements: ["dendro", "electro"],
            accent: "var(--electro)",
            note: "к Электро-удару добавляется урон Дендро",
            residue: "пробуждение сохраняется",
          }
        : {
            code: "spread",
            name: "Разрастание",
            elements: ["dendro", "electro"],
            accent: "var(--dendro)",
            note: "Дендро-удар усиливается",
            residue: "пробуждение сохраняется",
          },
      true,
    );
  }

  // «Заряжен»: обе ауры сосуществуют, пока одна из них не израсходована.
  if (next.ec) {
    const pair: ReactionElement[] = [next.aura!, next.ec];
    const has = (el: ReactionElement) => pair.includes(el);
    if (incoming === "electro" || incoming === "hydro") {
      if (flags.lunar) {
        nf.cloud = true;
        return settle(lunarCharged(), true);
      }
      return settle(
        {
          ...PAIRS["electro+hydro"]!,
          note: "разряд тикает по новой",
        },
        true,
      );
    }
    if (incoming === "pyro") {
      // Пар приносит Гидро в жертву, Электро-аура остаётся.
      next.ec = null;
      next.aura = has("electro") ? "electro" : null;
      return settle(
        {
          ...PAIRS["hydro+pyro"]!,
          note: amplifyNote("vaporize", "pyro"),
          residue: "Гидро израсходовано — Электро остаётся",
        },
        true,
      );
    }
    if (incoming === "cryo") {
      next.ec = null;
      next.frozen = true;
      next.aura = null;
      return settle(
        {
          ...PAIRS["cryo+hydro"]!,
          note: "лёд сковал цель — Заряжен разомкнут",
        },
        true,
      );
    }
    if (incoming === "dendro") {
      // Дендро сперва отвечает Электро — рождается пробуждение.
      next.ec = null;
      next.aura = "dendro";
      next.quicken = true;
      return settle(
        {
          ...PAIRS["dendro+electro"]!,
          note: "Дендро сперва встретило Электро",
        },
        true,
      );
    }
    if (incoming === "anemo") {
      return settle(
        {
          code: "swirl:hydro+electro",
          name: "Рассеивание · Гидро + Электро",
          elements: ["anemo", "hydro", "electro"],
          accent: "var(--anemo)",
          note: "двойное рассеивание — обе стихии разом",
          residue: "пара аур частично остаётся",
        },
        true,
      );
    }
    if (incoming === "geo") {
      return settle(
        {
          code: "crystallize:electro",
          name: "Кристаллизация · Электро",
          elements: ["geo", "electro"],
          accent: "var(--geo)",
          note: "кристалл-щит: Электро",
          residue: "пара аур частично остаётся",
        },
        true,
      );
    }
    return none();
  }

  if (next.aura === null) {
    // anemo and geo do not stay on the target — nothing to apply
    if (incoming === "anemo" || incoming === "geo") {
      return none();
    }
    next.aura = incoming;
    return settle(null, true);
  }

  const result = pairResult(next.aura, incoming);
  if (!result) {
    return none();
  }

  switch (result.code) {
    case "vaporize":
    case "melt": {
      next.aura = null;
      return settle({ ...result, note: amplifyNote(result.code, incoming) }, true);
    }
    case "electro-charged": {
      // Вторая аура подсаживается рядом с первой — разряд тикает дальше.
      next.ec = incoming;
      if (flags.lunar) {
        nf.cloud = true;
        return settle(lunarCharged(), true);
      }
      return settle(result, true);
    }
    case "freeze": {
      next.aura = null;
      next.frozen = true;
      return settle(result, true);
    }
    case "superconduct": {
      next.aura = null;
      if (flags.stellar) {
        nf.prism = true;
        return settle(stellarConduct(), true);
      }
      return settle(result, true);
    }
    case "burning": {
      next.aura = "pyro";
      next.burning = true;
      // огонь выжигает пробуждение вместе с Дендро-аурой
      next.quicken = false;
      return settle(result, true);
    }
    case "bloom": {
      next.aura = null;
      if (flags.lunar) {
        next.dew = Math.min(3, next.dew + 1);
        next.cores = Math.min(MAX_CORES, next.cores + 1);
        return settle(lunarBloom(next.dew), true);
      }
      const overflow = next.cores >= MAX_CORES;
      next.cores = overflow ? MAX_CORES : next.cores + 1;
      return settle(
        {
          ...result,
          note: overflow
            ? "старейшее ядро взорвалось — поле держит только пять"
            : result.note,
        },
        true,
      );
    }
    case "quicken": {
      next.aura = "dendro";
      next.quicken = true;
      return settle(result, true);
    }
    case "swirl:cryo": {
      if (flags.stellar) {
        const count = nf.vortexCount + 1;
        const burst = count >= 6;
        nf.vortexCount = burst ? 0 : count;
        nf.vortex = burst ? 0 : count >= 3 ? 2 : 1;
        return settle(stellarSwirl(nf.vortex === 2 ? 2 : 1, burst, count), true);
      }
      return settle(result, true);
    }
    case "crystallize:hydro": {
      if (flags.lunar) {
        nf.veils = 3;
        nf.veilCount += 1;
        return settle(lunarCrystallize(nf.veilCount % 3 === 0), true);
      }
      return settle(result, true);
    }
    default:
      next.aura = null;
      return settle(result, true);
  }
};

export type CodexGroup = "amplify" | "transform" | "dendro" | "lunar" | "stellar";

export type CodexMarker = "element" | "core" | "awakened" | "moon" | "veil" | "star";

export type CodexEntry = {
  code: string;
  name: string;
  group: CodexGroup;
  elements: ReactionElement[];
  marker?: CodexMarker;
  text: string;
  after?: string;
};

export const CODEX: CodexEntry[] = [
  {
    code: "vaporize",
    name: "Пар",
    group: "amplify",
    elements: ["pyro", "hydro"],
    text: "Усиливает удар: Пиро-триггер ×2, Гидро-триггер ×1,5.",
    after: "аура-жертва израсходована",
  },
  {
    code: "melt",
    name: "Таяние",
    group: "amplify",
    elements: ["pyro", "cryo"],
    text: "Усиливает удар: Пиро-триггер ×2, Крио-триггер ×1,5.",
    after: "аура-жертва израсходована",
  },
  {
    code: "overloaded",
    name: "Перегрузка",
    group: "transform",
    elements: ["pyro", "electro"],
    text: "Взрыв Пиро по площади, отбрасывает мелких врагов.",
    after: "ауры сброшены",
  },
  {
    code: "electro-charged",
    name: "Заряжен",
    group: "transform",
    elements: ["hydro", "electro"],
    text: "Разряд бьёт цепью по соседним целям и тикает, пока живы обе ауры.",
    after: "обе ауры остаются",
  },
  {
    code: "freeze",
    name: "Заморозка",
    group: "transform",
    elements: ["hydro", "cryo"],
    text: "Цель замерзает. Снимают лёд Таяние и «Разбит» — физический удар.",
    after: "лёд; Гидро и Крио продлевают",
  },
  {
    code: "superconduct",
    name: "Сверхпроводник",
    group: "transform",
    elements: ["cryo", "electro"],
    text: "Снижает физическое сопротивление цели.",
    after: "ауры сброшены",
  },
  {
    code: "swirl",
    name: "Рассеивание",
    group: "transform",
    elements: ["anemo"],
    marker: "element",
    text: "Анемо разносит стихию по площади и осаждает её на соседей. По паре «Заряжен» — двойное рассеивание.",
    after: "аура остаётся",
  },
  {
    code: "crystallize",
    name: "Кристаллизация",
    group: "transform",
    elements: ["geo"],
    marker: "element",
    text: "Гео даёт кристалл-щит стихии. Со льда тоже падает Крио-кристалл.",
    after: "аура остаётся",
  },
  {
    code: "burning",
    name: "Горение",
    group: "dendro",
    elements: ["pyro", "dendro"],
    text: "Непрерывный урон Пиро, пока горит Дендро.",
    after: "Пиро-аура и огонь",
  },
  {
    code: "bloom",
    name: "Цветение",
    group: "dendro",
    elements: ["hydro", "dendro"],
    text: "Рождаются ядра цветения — до пяти на поле. Ядра ждут Пиро или Электро.",
    after: "шестое ядро взрывает старейшее",
  },
  {
    code: "burgeon",
    name: "Бутонизация",
    group: "dendro",
    elements: ["hydro", "dendro", "pyro"],
    marker: "core",
    text: "Пиро по ядрам: взрыв уроном Дендро — срабатывают все ядра в радиусе.",
    after: "ядра потрачены",
  },
  {
    code: "hyperbloom",
    name: "Вегетация",
    group: "dendro",
    elements: ["hydro", "dendro", "electro"],
    marker: "core",
    text: "Электро по ядру: побег-стрела бьёт точечно. Один удар — одно ядро.",
    after: "остальные ядра ждут",
  },
  {
    code: "quicken",
    name: "Стимуляция",
    group: "dendro",
    elements: ["dendro", "electro"],
    text: "Пробуждает цель: Электро-удары дают Обострение, Дендро — Разрастание.",
    after: "пробуждение держится",
  },
  {
    code: "aggravate",
    name: "Обострение",
    group: "dendro",
    elements: ["dendro", "electro"],
    marker: "awakened",
    text: "Электро-атака по пробуждённой цели получает добавку урона.",
    after: "пробуждение сохраняется",
  },
  {
    code: "spread",
    name: "Разрастание",
    group: "dendro",
    elements: ["dendro", "electro"],
    marker: "awakened",
    text: "Дендро-атака по пробуждённой цели усиливается.",
    after: "пробуждение сохраняется",
  },
  {
    code: "lunar-charged",
    name: "Лунный заряд",
    group: "lunar",
    elements: ["hydro", "electro"],
    marker: "moon",
    text: "Заменяет «Заряжен»: грозовая туча 6 сек бьёт молнией мокрых и заряженных рядом.",
    after: "туча; обе ауры остаются",
  },
  {
    code: "lunar-bloom",
    name: "Лунная бутонизация",
    group: "lunar",
    elements: ["hydro", "dendro"],
    marker: "moon",
    text: "Заменяет «Цветение»: ядро как обычно, и отряд получает Зелёную росу — до трёх.",
    after: "ядро + роса",
  },
  {
    code: "lunar-crystallize",
    name: "Лунный кристалл",
    group: "lunar",
    elements: ["geo", "hydro"],
    marker: "moon",
    text: "Заменяет Гидро-кристаллизацию: рядом возникают три Лунные пелены.",
    after: "пелены держатся на поле",
  },
  {
    code: "moondrift-harmony",
    name: "Гармония Лунной пелены",
    group: "lunar",
    elements: ["geo", "hydro"],
    marker: "veil",
    text: "Каждая третья активация «Лунного кристалла»: пелены пускают залп самонаводящихся снарядов с уроном Гео.",
    after: "пелены остаются",
  },
  {
    code: "stellar-conduct",
    name: "Звёздный проводник",
    group: "stellar",
    elements: ["cryo", "electro"],
    marker: "star",
    text: "Заменяет «Сверхпроводник»: призма 7 сек держит Предел путеводной звезды — бонус Крио и Электро урона, врагам −40% физ. защиты.",
    after: "призма — 7 сек",
  },
  {
    code: "stellar-swirl",
    name: "Звёздное рассеивание",
    group: "stellar",
    elements: ["anemo", "cryo"],
    marker: "star",
    text: "Заменяет крио-рассеивание: Звёздный вихрь взрывается Крио-уроном. Третья активация — уровень 2, шестая — мгновенный взрыв.",
    after: "вихрь копит активации",
  },
];

export const matchCodex = (result: ReactionResult): CodexEntry | undefined =>
  CODEX.find(
    (entry) =>
      entry.code === result.code ||
      result.code.startsWith(`${entry.code}:`),
  );
