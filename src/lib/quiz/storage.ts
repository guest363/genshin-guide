import type { QuizBankId } from "./types";

const STORAGE_KEY = "teyvat-quiz-v1";

export type BankProgress = {
  /** Лучший результат: верных из всех. */
  best: number;
  total: number;
  attempts: number;
  updatedAt: number;
};

export type QuizProgress = {
  version: 1;
  banks: Partial<Record<QuizBankId, BankProgress>>;
};

export const EMPTY_PROGRESS: QuizProgress = { version: 1, banks: {} };

const isBankProgress = (value: unknown): value is BankProgress =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as BankProgress).best === "number" &&
  typeof (value as BankProgress).total === "number" &&
  typeof (value as BankProgress).attempts === "number";

const readProgress = (raw: string | null): QuizProgress => {
  if (!raw) {
    return EMPTY_PROGRESS;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      (parsed as QuizProgress).version !== 1 ||
      typeof (parsed as QuizProgress).banks !== "object" ||
      (parsed as QuizProgress).banks === null
    ) {
      return EMPTY_PROGRESS;
    }
    const banks: QuizProgress["banks"] = {};
    for (const [id, value] of Object.entries((parsed as QuizProgress).banks)) {
      if (isBankProgress(value)) {
        banks[id as QuizBankId] = value;
      }
    }
    return { version: 1, banks };
  } catch {
    return EMPTY_PROGRESS;
  }
};

export const loadQuizProgress = (): QuizProgress => {
  if (typeof localStorage === "undefined") {
    return EMPTY_PROGRESS;
  }
  try {
    return readProgress(localStorage.getItem(STORAGE_KEY));
  } catch {
    return EMPTY_PROGRESS;
  }
};

const persist = (progress: QuizProgress): void => {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Приватный режим или переполнение — прогресс просто не сохранится.
  }
};

/** Чистая функция: фиксирует попытку, улучшая лучший результат. */
export const recordAttempt = (
  progress: QuizProgress,
  bankId: QuizBankId,
  correct: number,
  total: number,
): QuizProgress => {
  const previous = progress.banks[bankId];
  const best = Math.max(previous?.best ?? 0, correct);
  const next: BankProgress = {
    best,
    total,
    attempts: (previous?.attempts ?? 0) + 1,
    updatedAt: Date.now(),
  };
  return {
    version: 1,
    banks: { ...progress.banks, [bankId]: next },
  };
};

/** Записывает результат попытки и возвращает обновлённый прогресс. */
export const saveAttemptResult = (
  bankId: QuizBankId,
  correct: number,
  total: number,
): QuizProgress => {
  const next = recordAttempt(loadQuizProgress(), bankId, correct, total);
  persist(next);
  return next;
};

/** Средний процент лучших попыток по тестам, где была хотя бы одна игра. */
export const overallPercent = (progress: QuizProgress): number => {
  const played = Object.values(progress.banks).filter(
    (entry): entry is BankProgress =>
      entry !== undefined && entry.total > 0 && entry.attempts > 0,
  );
  if (played.length === 0) {
    return 0;
  }
  const sum = played.reduce(
    (acc, entry) => acc + Math.round((entry.best / entry.total) * 100),
    0,
  );
  return Math.round(sum / played.length);
};

export const bankBestPercent = (
  progress: QuizProgress,
  bankId: QuizBankId,
): number | null => {
  const entry = progress.banks[bankId];
  if (!entry || entry.total === 0) {
    return null;
  }
  return Math.round((entry.best / entry.total) * 100);
};
