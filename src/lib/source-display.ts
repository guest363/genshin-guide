import type { CharacterSource } from "./character";

export type SourceCard = {
  kind: string;
  hint: string;
  title: string;
  url: string;
  host: string;
  action: string;
};

const hostOf = (url: string): string => {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
};

export const describeSource = (source: CharacterSource): SourceCard => {
  const url = source.url;
  const host = hostOf(url);
  if (url.includes("yatta.moe") || url.includes("hoyoverse") || url.includes("mihoyo.com")) {
    return {
      kind: "Игровой клиент",
      hint: "Имя, стихия, таланты и созвездия из клиента игры.",
      title: "Игровые строки персонажа",
      url,
      host,
      action: "Открыть строки из игры",
    };
  }
  if (url.includes("/Лор") || url.includes("%D0%9B%D0%BE%D1%80")) {
    return {
      kind: "Лор",
      hint: "Биография, характер и внешность по канону вики.",
      title: "История и характер",
      url,
      host,
      action: "Читать лор",
    };
  }
  if (url.includes("Character/List") || url.includes("Character%2FList")) {
    return {
      kind: "Список персонажей",
      hint: "Канонический ростер играбельных героев.",
      title: "Полный список героев",
      url,
      host,
      action: "Открыть список",
    };
  }
  if (url.includes("fandom.com")) {
    return {
      kind: "Страница вики",
      hint: "Справка по оружию, редкости и материалам.",
      title: "Страница персонажа",
      url,
      host,
      action: "Открыть страницу вики",
    };
  }
  return {
    kind: "Ссылка",
    hint: "Дополнительный источник по персонажу.",
    title: source.title,
    url,
    host,
    action: "Открыть источник",
  };
};
