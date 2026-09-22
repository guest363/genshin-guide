import type { ElementId } from "../character";

/** Сложность вопроса: 1 — общеизвестное, 2 — нужно играть, 3 — глубокий лор. */
export type QuizDifficulty = 1 | 2 | 3;

export type QuizQuestion = {
  id: string;
  prompt: string;
  /** Ровно четыре варианта; верный — по индексу `answer`. */
  options: string[];
  answer: number;
  explanation: string;
  difficulty: QuizDifficulty;
};

export type QuizBankId =
  | "regions"
  | "characters"
  | "monsters"
  | "story"
  | "mechanics";

export type QuizBank = {
  id: QuizBankId;
  title: string;
  kicker: string;
  lead: string;
  /** Стихия-акцент: красит точку карточки и фон-ауру во время теста. */
  element: ElementId;
  questions: QuizQuestion[];
  /** Сколько вопросов в одной попытке этого банка. */
  attemptSize: number;
};

/** Вопрос попытки: варианты перемешаны, `answerIndex` — верный в них. */
export type AttemptQuestion = {
  id: string;
  prompt: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  difficulty: QuizDifficulty;
};

/** Один тест: тема × уровень сложности. Отдельная единица прогресса. */
export type Attempt = {
  testId: string;
  bankId: QuizBankId;
  bankTitle: string;
  bankKicker: string;
  tierLabel: string;
  questions: AttemptQuestion[];
  /** Выбранные индексы вариантов; null — ещё не отвечен. */
  picks: Array<number | null>;
};

export type AttemptResult = {
  correct: number;
  total: number;
  percent: number;
};

export const TIER_LABELS: Record<QuizDifficulty, string> = {
  1: "Лёгкий",
  2: "Средний",
  3: "Сложный",
};

export const testId = (bankId: QuizBankId, tier: QuizDifficulty): string =>
  `${bankId}-${tier}`;
