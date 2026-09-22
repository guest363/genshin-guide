import type {
  Attempt,
  AttemptQuestion,
  AttemptResult,
  QuizBank,
  QuizDifficulty,
  QuizQuestion,
} from "./types";

/** Сколько вопросов в одной попытке. */
export const ATTEMPT_SIZE = 5;

export type Rng = () => number;

/** Детерминированный ГПСЧ для тестов; в приложении идёт Math.random. */
export const mulberry32 = (seed: number): Rng => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
};

/** Тасует копию массива (Фишер—Йетс), не меняя исходник. */
export const shuffle = <T>(items: readonly T[], rng: Rng = Math.random): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = tmp;
  }
  return copy;
};

const prepareQuestion = (
  question: QuizQuestion,
  rng: Rng,
): AttemptQuestion => {
  const options = shuffle(question.options, rng);
  return {
    id: question.id,
    prompt: question.prompt,
    options,
    answerIndex: options.indexOf(question.options[question.answer]!),
    explanation: question.explanation,
    difficulty: question.difficulty,
  };
};

/** Пул вопросов банка на заданном уровне сложности. */
export const tierPool = (
  bank: QuizBank,
  tier: QuizDifficulty,
): QuizQuestion[] =>
  bank.questions.filter((question) => question.difficulty === tier);

/**
 * Собирает попытку: берёт случайные вопросы из пула, идёт от простых к
 * сложным, перемешивает варианты.
 */
export const buildAttempt = (
  id: string,
  bankId: Attempt["bankId"],
  bankTitle: string,
  bankKicker: string,
  tierLabel: string,
  pool: readonly QuizQuestion[],
  rng: Rng = Math.random,
  size: number = ATTEMPT_SIZE,
): Attempt => {
  const picked = shuffle(pool, rng)
    .slice(0, Math.min(size, pool.length))
    .map((question) => prepareQuestion(question, rng));
  picked.sort(
    (left, right) =>
      left.difficulty - right.difficulty ||
      left.id.localeCompare(right.id, "ru"),
  );
  return {
    testId: id,
    bankId,
    bankTitle,
    bankKicker,
    tierLabel,
    questions: picked,
    picks: picked.map(() => null),
  };
};

export const isAttemptDone = (attempt: Attempt): boolean =>
  attempt.picks.every((pick) => pick !== null);

export const gradeAttempt = (attempt: Attempt): AttemptResult => {
  let correct = 0;
  attempt.questions.forEach((question, index) => {
    if (attempt.picks[index] === question.answerIndex) {
      correct += 1;
    }
  });
  const total = attempt.questions.length;
  return {
    correct,
    total,
    percent: total === 0 ? 0 : Math.round((correct / total) * 100),
  };
};
