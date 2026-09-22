import { describe, expect, it } from "vitest";
import { loadResearchCharacters } from "../load-research-characters";
import { STATIC_BANKS } from "./banks";
import { buildCharactersQuestions } from "./characters-pool";
import {
  ATTEMPT_SIZE,
  buildAttempt,
  gradeAttempt,
  isAttemptDone,
  mulberry32,
  shuffle,
  tierPool,
} from "./engine";
import { KNOWLEDGE_RANKS, nextRank, rankForPercent, rankProgress } from "./ranks";
import {
  bankBestPercent,
  EMPTY_PROGRESS,
  overallPercent,
  recordAttempt,
} from "./storage";
import {
  TIER_LABELS,
  testId,
  type QuizBank,
  type QuizDifficulty,
} from "./types";

const characters = loadResearchCharacters();

const banks: QuizBank[] = STATIC_BANKS.map((bank) =>
  bank.id === "characters"
    ? { ...bank, questions: buildCharactersQuestions(characters) }
    : bank,
);

describe("банки вопросов", () => {
  it("содержит пять тем", () => {
    expect(banks.map((bank) => bank.id)).toEqual([
      "regions",
      "characters",
      "monsters",
      "story",
      "mechanics",
    ]);
  });

  it.each(banks.map((bank) => [bank.id, bank.questions] as const))(
    "банк %s: вопросы корректны",
    (_, questions) => {
      expect(questions.length).toBeGreaterThanOrEqual(10);
      const ids = new Set<string>();
      for (const question of questions) {
        expect(question.prompt.length).toBeGreaterThan(5);
        expect(question.explanation.length).toBeGreaterThan(10);
        expect(question.options).toHaveLength(4);
        expect(new Set(question.options).size).toBe(4);
        expect(question.answer).toBeGreaterThanOrEqual(0);
        expect(question.answer).toBeLessThan(4);
        expect(ids.has(question.id)).toBe(false);
        ids.add(question.id);
      }
    },
  );

  it.each(banks.map((bank) => bank.id))(
    "банк %s: на каждом уровне хватает вопросов на тест",
    (bankId) => {
      const bank = banks.find((item) => item.id === bankId)!;
      for (const tier of [1, 2, 3] as QuizDifficulty[]) {
        expect(tierPool(bank, tier).length).toBeGreaterThanOrEqual(
          bank.attemptSize,
        );
      }
    },
  );

  it("банк персонажей генерируется из дампа и покрывает архонтов", () => {
    const pool = buildCharactersQuestions(characters);
    expect(pool.length).toBeGreaterThan(400);
    expect(pool.some((question) => question.id.startsWith("archon-"))).toBe(
      true,
    );
    const regionQuestion = pool.find(
      (question) => question.id === "region-amber",
    );
    expect(regionQuestion?.options).toContain("Мондштадт");
    for (const question of pool) {
      if (question.id.startsWith("region-")) {
        expect(question.options).not.toContain("Без региона");
      }
    }
  });

  it("уровни персонажного банка распределены по типам вопросов", () => {
    const pool = buildCharactersQuestions(characters);
    const byTier = [1, 2, 3].map((tier) =>
      pool.filter((question) => question.difficulty === tier).length,
    );
    expect(byTier[0]!).toBeGreaterThan(100);
    expect(byTier[1]!).toBeGreaterThan(100);
    expect(byTier[2]!).toBeGreaterThan(100);
  });

  it("персонажный банк собирает длинную попытку без повторов", () => {
    const bank = banks.find((item) => item.id === "characters")!;
    expect(bank.attemptSize).toBe(20);
    const attempt = buildAttempt(
      testId(bank.id, 3),
      bank.id,
      bank.title,
      bank.kicker,
      TIER_LABELS[3],
      tierPool(bank, 3),
      mulberry32(11),
      bank.attemptSize,
    );
    expect(attempt.questions).toHaveLength(20);
    expect(new Set(attempt.questions.map((q) => q.id)).size).toBe(20);
    for (const question of attempt.questions) {
      expect(question.difficulty).toBe(3);
    }
  });
});

describe("движок попыток", () => {
  it("перемешивает копию, не трогая исходник", () => {
    const source = [1, 2, 3, 4, 5];
    const mixed = shuffle(source, mulberry32(7));
    expect([...mixed].sort((a, b) => a - b)).toEqual(source);
    expect(source).toEqual([1, 2, 3, 4, 5]);
  });

  const bank = banks.find((item) => item.id === "regions")!;

  it("собирает попытку из пяти уникальных вопросов одного уровня", () => {
    const attempt = buildAttempt(
      testId(bank.id, 2),
      bank.id,
      bank.title,
      bank.kicker,
      TIER_LABELS[2],
      tierPool(bank, 2),
      mulberry32(42),
    );
    expect(attempt.testId).toBe("regions-2");
    expect(attempt.questions).toHaveLength(ATTEMPT_SIZE);
    expect(new Set(attempt.questions.map((q) => q.id)).size).toBe(ATTEMPT_SIZE);
    for (const question of attempt.questions) {
      expect(question.difficulty).toBe(2);
    }
  });

  it("перемешанные варианты сохраняют верный ответ", () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const attempt = buildAttempt(
        testId(bank.id, 1),
        bank.id,
        bank.title,
        bank.kicker,
        TIER_LABELS[1],
        tierPool(bank, 1),
        mulberry32(seed),
      );
      for (const question of attempt.questions) {
        expect(question.options).toHaveLength(4);
        const original = bank.questions.find((q) => q.id === question.id)!;
        const correct = original.options[original.answer]!;
        expect(question.options[question.answerIndex]).toBe(correct);
      }
    }
  });

  it("считает результат и видит завершение", () => {
    const attempt = buildAttempt(
      testId(bank.id, 3),
      bank.id,
      bank.title,
      bank.kicker,
      TIER_LABELS[3],
      tierPool(bank, 3),
      mulberry32(1),
    );
    expect(isAttemptDone(attempt)).toBe(false);
    attempt.questions.forEach((question, index) => {
      attempt.picks[index] =
        index % 3 === 0 ? question.answerIndex : (question.answerIndex + 1) % 4;
    });
    expect(isAttemptDone(attempt)).toBe(true);
    const grade = gradeAttempt(attempt);
    expect(grade.total).toBe(ATTEMPT_SIZE);
    expect(grade.correct).toBe(2);
    expect(grade.percent).toBe(40);
  });
});

describe("прогресс и ранги", () => {
  it("фиксирует попытку и не даёт лучшему результату ухудшиться", () => {
    let progress = recordAttempt(EMPTY_PROGRESS, "regions-2", 3, 5);
    expect(progress.banks["regions-2"]).toMatchObject({ best: 3, attempts: 1 });
    progress = recordAttempt(progress, "regions-2", 5, 5);
    expect(progress.banks["regions-2"]).toMatchObject({ best: 5, attempts: 2 });
    progress = recordAttempt(progress, "regions-2", 1, 5);
    expect(progress.banks["regions-2"]?.best).toBe(5);
    expect(bankBestPercent(progress, "regions-2")).toBe(100);
    expect(bankBestPercent(progress, "story-3")).toBeNull();
  });

  it("считает общий уровень по среднему лучших", () => {
    let progress = recordAttempt(EMPTY_PROGRESS, "regions-1", 4, 5);
    expect(overallPercent(progress)).toBe(80);
    progress = recordAttempt(progress, "story-3", 3, 5);
    expect(overallPercent(progress)).toBe(70);
  });

  it("лестница рангов идёт по границам", () => {
    expect(rankForPercent(0).title).toBe("Безымянный путник");
    expect(rankForPercent(19).title).toBe("Безымянный путник");
    expect(rankForPercent(20).title).toBe("Искатель приключений");
    expect(rankForPercent(94).title).toBe("Мудрец Академии");
    expect(rankForPercent(95).title).toBe("Архонт знаний");
    expect(nextRank(95)).toBeNull();
    expect(nextRank(0)?.min).toBe(KNOWLEDGE_RANKS[1]!.min);
    expect(rankProgress(0)).toBe(0);
    expect(rankProgress(95)).toBe(1);
  });
});
