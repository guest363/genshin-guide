import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { CharacterRecord } from "./character";
import { parseCharacterMarkdown } from "./parse-character";

export const RESEARCH_CHARACTERS_DIR = join(
  import.meta.dirname,
  "../../research/characters",
);

export const loadResearchCharacters = (): CharacterRecord[] => {
  const files = readdirSync(RESEARCH_CHARACTERS_DIR)
    .filter((name) => name.endsWith(".md"))
    .sort();
  const records: CharacterRecord[] = [];
  for (const name of files) {
    const raw = readFileSync(join(RESEARCH_CHARACTERS_DIR, name), "utf8");
    records.push(parseCharacterMarkdown(raw));
  }
  return records;
};
