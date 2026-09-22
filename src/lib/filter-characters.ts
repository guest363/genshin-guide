import type { CharacterFilters, CharacterRecord } from "./character";

export const filterCharacters = (
  characters: CharacterRecord[],
  filters: CharacterFilters,
): CharacterRecord[] => {
  const query = filters.query?.trim().toLowerCase() ?? "";
  const result: CharacterRecord[] = [];

  for (const character of characters) {
    if (
      filters.element &&
      filters.element !== "all" &&
      character.element !== filters.element
    ) {
      continue;
    }
    if (
      filters.weapon &&
      filters.weapon !== "all" &&
      character.weapon !== filters.weapon
    ) {
      continue;
    }
    if (
      filters.rarity &&
      filters.rarity !== "all" &&
      character.rarity !== filters.rarity
    ) {
      continue;
    }
    if (
      filters.region &&
      filters.region !== "all" &&
      character.region !== filters.region
    ) {
      continue;
    }
    if (filters.archon && character.archon !== true) {
      continue;
    }
    if (query) {
      const haystack = `${character.name} ${character.shortName} ${character.nameEn} ${character.title}`.toLowerCase();
      if (!haystack.includes(query)) {
        continue;
      }
    }
    result.push(character);
  }

  return result;
};

export const findCharacterBySlug = (
  characters: CharacterRecord[],
  slug: string,
): CharacterRecord | undefined => {
  for (const character of characters) {
    if (character.slug === slug) {
      return character;
    }
  }
  return undefined;
};
