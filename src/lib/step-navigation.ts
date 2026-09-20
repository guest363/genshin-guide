import type { CharacterRecord, CharacterStep } from "./character";

export type DossierSectionId = "overview" | "story" | "talents" | "guide";

export const DOSSIER_SECTIONS: { id: DossierSectionId; title: string }[] = [
  { id: "overview", title: "Обзор" },
  { id: "story", title: "История" },
  { id: "talents", title: "Таланты" },
  { id: "guide", title: "Гайд" },
];

export const stepsForSection = (
  character: CharacterRecord,
  section: DossierSectionId,
): CharacterStep[] => {
  if (section === "overview") {
    return character.profileSteps;
  }
  if (section === "story") {
    return character.storySteps;
  }
  if (section === "talents") {
    return character.talentSteps;
  }
  return character.guideSteps;
};

export const clampStepIndex = (index: number, length: number): number => {
  if (length <= 0 || !Number.isFinite(index)) {
    return 0;
  }
  if (index < 0) {
    return 0;
  }
  if (index >= length) {
    return length - 1;
  }
  return index;
};

export const nextStepIndex = (index: number, length: number): number =>
  clampStepIndex(index + 1, length);

export const previousStepIndex = (index: number, length: number): number =>
  clampStepIndex(index - 1, length);
