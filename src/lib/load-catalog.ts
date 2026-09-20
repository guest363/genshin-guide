import type { CharacterRecord } from "./character";
import { parseCharacterMarkdown } from "./parse-character";

export const loadCatalogCharacters = (): CharacterRecord[] => {
  const modules = import.meta.glob<string>("../../research/characters/*.md", {
    eager: true,
    query: "?raw",
    import: "default",
  });
  const records: CharacterRecord[] = [];
  for (const raw of Object.values(modules)) {
    records.push(parseCharacterMarkdown(raw));
  }
  records.sort((left, right) => Number(right.id) - Number(left.id));
  return records;
};
