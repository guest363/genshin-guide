import type { CharacterRecord } from "../character";
import type { QuizDifficulty, QuizQuestion } from "./types";

// Вопросы банка «Персонажи» не хранятся вторым набором фактов — они
// генерируются из полей дампа research/characters при сборке страницы.

const factLine = (record: CharacterRecord): string =>
  `${record.name} (${record.nameEn}) — ${record.rarity}★, ${record.elementLabel}, ${record.weaponLabel}. Регион: ${record.regionLabel}. Созвездие «${record.constellation}».`;

const makeQuestion = (
  id: string,
  difficulty: QuizDifficulty,
  prompt: string,
  correct: string,
  distractors: string[],
  explanation: string,
): QuizQuestion => ({
  id,
  prompt,
  options: [correct, ...distractors],
  answer: 0,
  explanation,
  difficulty,
});

/** Три отличимых от верного значения, снятые с соседних записей дампа. */
const pickDistractors = (
  records: readonly CharacterRecord[],
  index: number,
  read: FieldReader,
  correct: string,
  acceptable: (value: string) => boolean = () => true,
): string[] | null => {
  const values: string[] = [];
  const seen = new Set([correct]);
  for (let step = 1; values.length < 3 && step <= records.length; step += 1) {
    const value = read(records[(index + step) % records.length]!);
    if (value && acceptable(value) && !seen.has(value)) {
      seen.add(value);
      values.push(value);
    }
  }
  return values.length === 3 ? values : null;
};

type FieldReader = (record: CharacterRecord) => string;

const fieldQuestions = (
  records: readonly CharacterRecord[],
  slug: string,
  difficulty: QuizDifficulty,
  prompt: (record: CharacterRecord) => string,
  read: FieldReader,
  allowed?: (record: CharacterRecord) => boolean,
  explain?: (record: CharacterRecord) => string,
  acceptable?: (value: string) => boolean,
): QuizQuestion[] => {
  const questions: QuizQuestion[] = [];
  records.forEach((record, index) => {
    if (allowed && !allowed(record)) {
      return;
    }
    const correct = read(record);
    const distractors = pickDistractors(
      records,
      index,
      read,
      correct,
      acceptable,
    );
    if (!distractors) {
      return;
    }
    questions.push(
      makeQuestion(
        `${slug}-${record.slug}`,
        difficulty,
        prompt(record),
        correct,
        distractors,
        explain ? explain(record) : factLine(record),
      ),
    );
  });
  return questions;
};

const archonQuestions = (
  records: readonly CharacterRecord[],
): QuizQuestion[] => {
  const archons = records.filter((record) => record.archon);
  const plain = records.filter((record) => !record.archon);
  if (archons.length === 0 || plain.length < 3) {
    return [];
  }
  return archons.map((archon, index) => {
    const names: string[] = [];
    const seen = new Set([archon.name]);
    for (
      let step = 1;
      names.length < 3 && step <= plain.length;
      step += 1
    ) {
      const candidate = plain[(index * 7 + step * 13) % plain.length]!;
      if (!seen.has(candidate.name)) {
        seen.add(candidate.name);
        names.push(candidate.name);
      }
    }
    if (names.length < 3) {
      return null;
    }
    return makeQuestion(
      `archon-${archon.slug}`,
      3,
      "Кто из этих персонажей — Архонт?",
      archon.name,
      names,
      `${archon.name} — ${archon.title}, ${archon.elementLabel}-архонт региона ${archon.regionLabel}. Остальные — обычные (пусть и легендарные) обитатели Тейвата.`,
    );
  }).filter((question): question is QuizQuestion => question !== null);
};

// Уровни: стихия и оружие знают все, регион/титул/организация — играющие,
// созвездия и архонтный статус — глубокое знание архива.
export const buildCharactersQuestions = (
  records: readonly CharacterRecord[],
): QuizQuestion[] => [
  ...fieldQuestions(records, "element", 1, (record) => `Какой стихией владеет ${record.name}?`, (record) => record.elementLabel, (record) => record.element !== "adaptive"),
  ...fieldQuestions(records, "weapon", 1, (record) => `Какое оружие у ${record.name}?`, (record) => record.weaponLabel),
  ...fieldQuestions(records, "region", 2, (record) => `Из какого региона ${record.name}?`, (record) => record.regionLabel, (record) => record.region !== "none", undefined, (value) => value !== "Без региона"),
  ...fieldQuestions(records, "title", 2, (record) => `Какой титул носит ${record.name}?`, (record) => record.title),
  ...fieldQuestions(records, "affiliation", 2, (record) => `К какой организации принадлежит ${record.name}?`, (record) => record.affiliation, (record) => record.affiliation.length > 2),
  ...fieldQuestions(records, "constellation", 3, (record) => `Как называется созвездие ${record.name}?`, (record) => record.constellation),
  ...archonQuestions(records),
];
