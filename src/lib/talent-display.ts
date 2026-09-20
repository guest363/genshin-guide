import type { CharacterStep } from "./character";

export const splitHeading = (title: string): { kind: string; name: string } => {
  const index = title.indexOf(": ");
  if (index < 0) {
    return { kind: "", name: title };
  }
  return { kind: title.slice(0, index), name: title.slice(index + 2) };
};

export const isConstellation = (step: CharacterStep): boolean =>
  step.id.startsWith("constellation-") || step.title.startsWith("Созвездие");

export const summarizeTalent = (body: string): string => {
  const first = body.split(/\n\s*\n/)[0]?.trim() ?? body;
  if (first.length <= 160) {
    return first;
  }
  const cut = first.slice(0, 157);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 80 ? lastSpace : 157)}…`;
};

export const combatTalentsOf = (steps: CharacterStep[]): CharacterStep[] => {
  const result: CharacterStep[] = [];
  for (const step of steps) {
    if (!isConstellation(step)) {
      result.push(step);
    }
  }
  return result;
};

export const constellationsOf = (steps: CharacterStep[]): CharacterStep[] => {
  const result: CharacterStep[] = [];
  for (const step of steps) {
    if (isConstellation(step)) {
      result.push(step);
    }
  }
  return result;
};
