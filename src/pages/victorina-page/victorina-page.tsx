import { useState } from "react";
import { Link } from "react-router-dom";
import { ElementAura } from "../../components/element-aura";
import { loadCatalogCharacters } from "../../lib/load-catalog";
import { buildCharactersQuestions } from "../../lib/quiz/characters-pool";
import { STATIC_BANKS } from "../../lib/quiz/banks";
import {
  buildAttempt,
  gradeAttempt,
  tierPool,
} from "../../lib/quiz/engine";
import {
  nextRank,
  rankForPercent,
  rankProgress,
} from "../../lib/quiz/ranks";
import {
  bankBestPercent,
  loadQuizProgress,
  overallPercent,
  saveAttemptResult,
  type QuizProgress,
} from "../../lib/quiz/storage";
import {
  TIER_LABELS,
  testId,
  type Attempt,
  type AttemptResult,
  type QuizBank,
  type QuizDifficulty,
} from "../../lib/quiz/types";
import styles from "./victorina-page.module.css";

const characters = loadCatalogCharacters();

// Персонажный банк не хранит своих фактов: вопросы собираются из дампа.
const banks: QuizBank[] = STATIC_BANKS.map((bank) =>
  bank.id === "characters"
    ? { ...bank, questions: buildCharactersQuestions(characters) }
    : bank,
);

const TIERS: QuizDifficulty[] = [1, 2, 3];

const LETTERS = ["А", "Б", "В", "Г"];

const ROMAN = ["", "I", "II", "III"];

type Outcome = { grade: AttemptResult; improved: boolean };

const scrollUp = () => {
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
};

const scrollToReview = () => {
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  document
    .getElementById("quiz-review")
    ?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
};

export const VictorinaPage = () => {
  const [progress, setProgress] = useState<QuizProgress>(() =>
    loadQuizProgress(),
  );
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [shown, setShown] = useState(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const bank = attempt
    ? (banks.find((item) => item.id === attempt.bankId) ?? null)
    : null;

  const startAttempt = (target: QuizBank, tier: QuizDifficulty) => {
    setAttempt(
      buildAttempt(
        testId(target.id, tier),
        target.id,
        target.title,
        target.kicker,
        TIER_LABELS[tier],
        tierPool(target, tier),
        Math.random,
        target.attemptSize,
      ),
    );
    setShown(0);
    setOutcome(null);
    scrollUp();
  };

  const backToMenu = () => {
    setAttempt(null);
    setOutcome(null);
    scrollUp();
  };

  const answer = (optionIndex: number) => {
    if (!attempt || attempt.picks[shown] !== null) {
      return;
    }
    const picks = [...attempt.picks];
    picks[shown] = optionIndex;
    setAttempt({ ...attempt, picks });
  };

  const finish = () => {
    if (!attempt) {
      return;
    }
    const grade = gradeAttempt(attempt);
    const previous = progress.banks[attempt.testId];
    const improved = !previous || grade.correct > previous.best;
    setProgress(saveAttemptResult(attempt.testId, grade.correct, grade.total));
    setOutcome({ grade, improved });
    scrollUp();
  };

  const overall = overallPercent(progress);
  const rank = rankForPercent(overall);
  const upcoming = nextRank(overall);

  return (
    <main className={styles.page} data-accent={bank?.element ?? "adaptive"}>
      <ElementAura element={bank?.element ?? "adaptive"} />

      {!attempt ? (
        <>
          <div className={styles.bar}>
            <Link className={styles.back} to="/">
              ← Архив
            </Link>
            <p className={styles.crumb}>Викторина</p>
          </div>

          <header className={styles.head}>
            <p className={styles.kicker}>Испытание знаний</p>
            <h1 className={styles.title}>Викторина Тейвата</h1>
            <p className={styles.lead}>
              Пять тем — регионы, персонажи, монстры, история и механики. У
              каждой темы три испытания: лёгкое, среднее и сложное. Обычно в
              тесте пять вопросов, в банке персонажей — двадцать. После теста
              ждёт разбор с пояснениями, прогресс сохраняется, тесты можно
              перепроходить.
            </p>
          </header>

          <section className={styles.overall} aria-label="Уровень знаний">
            <div className={styles.overallCopy}>
              <p className={styles.overallKicker}>Уровень знаний</p>
              <p className={styles.rankTitle}>{rank.title}</p>
              <p className={styles.rankHint}>
                {overall === 0
                  ? "Пройдите любой тест, чтобы звёзды заметили вас"
                  : upcoming
                    ? `${rank.hint}. До ранга «${upcoming.title}» — ${upcoming.min - overall}%`
                    : rank.hint}
              </p>
            </div>
            <div className={styles.overallMeter}>
              <div className={styles.rankTrack}>
                <span
                  className={styles.rankFill}
                  style={{ width: `${Math.round(rankProgress(overall) * 100)}%` }}
                />
              </div>
              <p className={styles.overallPercent}>{overall}% по лучшим попыткам</p>
            </div>
          </section>

          <div className={styles.grid}>
            {banks.map((item) => (
              <article
                className={styles.card}
                key={item.id}
                data-accent={item.element}
              >
                <span className={styles.cardDot} aria-hidden="true" />
                <p className={styles.cardKicker}>{item.kicker}</p>
                <h2 className={styles.cardTitle}>{item.title}</h2>
                <p className={styles.cardLead}>{item.lead}</p>
                <div className={styles.tiers}>
                  {TIERS.map((tier) => {
                    const best = bankBestPercent(progress, testId(item.id, tier));
                    const targetSize = item.attemptSize;
                    return (
                      <button
                        className={styles.tierRow}
                        key={tier}
                        type="button"
                        data-tier={tier}
                        onClick={() => startAttempt(item, tier)}
                      >
                        <span className={styles.tierName}>
                          {TIER_LABELS[tier]}
                        </span>
                        <span className={styles.tierMeta}>
                          {best !== null
                            ? `лучший результат ${best}%`
                            : `${targetSize} из ${tierPool(item, tier).length} вопросов`}
                        </span>
                        <span className={styles.tierArrow} aria-hidden="true">
                          →
                        </span>
                      </button>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        </>
      ) : null}

      {attempt && bank && !outcome ? (
        <>
          <div className={styles.bar}>
            <button
              className={styles.back}
              type="button"
              onClick={backToMenu}
            >
              ← К тестам
            </button>
            <p className={styles.crumb}>
              {attempt.bankTitle} · {attempt.tierLabel.toLowerCase()} · вопрос{" "}
              {shown + 1} из {attempt.questions.length}
            </p>
          </div>

          <div
            className={styles.track}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={attempt.questions.length}
            aria-valuenow={shown + 1}
            aria-label="Прогресс теста"
          >
            <span
              className={styles.trackFill}
              style={{
                width: `${((shown + 1) / attempt.questions.length) * 100}%`,
              }}
            />
          </div>

          <div className={styles.dots} aria-hidden="true">
            {attempt.questions.map((question, index) => {
              const pick = attempt.picks[index];
              return (
                <span
                  key={question.id}
                  className={styles.dot}
                  data-state={
                    pick === null
                      ? index === shown
                        ? "current"
                        : "ahead"
                      : pick === question.answerIndex
                        ? "good"
                        : "bad"
                  }
                />
              );
            })}
          </div>

          {(() => {
            const question = attempt.questions[shown]!;
            const pick = attempt.picks[shown];
            const answered = pick !== null;
            const last = shown === attempt.questions.length - 1;
            return (
              <section className={styles.questionCard} key={question.id}>
                <p className={styles.qMeta}>
                  <span className={styles.qDifficulty}>
                    Сложность {ROMAN[question.difficulty]}
                  </span>
                  <span className={styles.qCategory}>{attempt.bankKicker}</span>
                </p>
                <h1 className={styles.qPrompt}>{question.prompt}</h1>
                <div className={styles.answers}>
                  {question.options.map((option, optionIndex) => {
                    const isCorrect = optionIndex === question.answerIndex;
                    const isPicked = optionIndex === pick;
                    return (
                      <button
                        className={styles.answer}
                        key={option}
                        type="button"
                        data-state={
                          !answered
                            ? undefined
                            : isCorrect
                              ? "good"
                              : isPicked
                                ? "bad"
                                : "idle"
                        }
                        disabled={answered}
                        onClick={() => answer(optionIndex)}
                      >
                        <span className={styles.answerMark}>
                          {LETTERS[optionIndex]}
                        </span>
                        <span className={styles.answerText}>{option}</span>
                      </button>
                    );
                  })}
                </div>
                {answered ? (
                  <div className={styles.nextRow}>
                    <button
                      className={styles.nextButton}
                      type="button"
                      onClick={last ? finish : () => setShown(shown + 1)}
                    >
                      {last ? "К результатам" : "Далее →"}
                    </button>
                  </div>
                ) : null}
              </section>
            );
          })()}
        </>
      ) : null}

      {attempt && bank && outcome ? (
        <>
          <div className={styles.bar}>
            <button
              className={styles.back}
              type="button"
              onClick={backToMenu}
            >
              ← К тестам
            </button>
            <p className={styles.crumb}>
              {attempt.bankTitle} · {attempt.tierLabel.toLowerCase()} · итоги
            </p>
          </div>

          <section className={styles.resultCard}>
            <p className={styles.scoreNum}>
              {outcome.grade.correct} из {outcome.grade.total}
            </p>
            <p className={styles.scoreLabel}>
              {outcome.grade.percent}% верных ответов ·{" "}
              {outcome.improved
                ? "новая лучшая попытка!"
                : `лучший результат ${
                    progress.banks[attempt.testId]?.best ?? outcome.grade.correct
                  } из ${outcome.grade.total}`}
            </p>
            <div className={styles.resultActions}>
              <button
                className={styles.nextButton}
                type="button"
                onClick={() => startAttempt(bank, attempt.questions[0]!.difficulty)}
              >
                Пройти снова
              </button>
              <button
                className={styles.ghostButton}
                type="button"
                onClick={scrollToReview}
              >
                Разбор ответов ↓
              </button>
            </div>
          </section>

          <section className={styles.review} id="quiz-review">
            <p className={styles.kicker}>Разбор</p>
            <h2 className={styles.reviewTitle}>Правильные ответы с пояснениями</h2>
            <ol className={styles.reviewList}>
              {attempt.questions.map((question, index) => {
                const pick = attempt.picks[index];
                return (
                  <li className={styles.reviewItem} key={question.id}>
                    <p className={styles.reviewPrompt}>
                      <span className={styles.reviewNum}>{index + 1}</span>
                      {question.prompt}
                    </p>
                    <ul className={styles.reviewOptions}>
                      {question.options.map((option, optionIndex) => {
                        const isCorrect = optionIndex === question.answerIndex;
                        const isPicked = optionIndex === pick;
                        if (!isCorrect && !isPicked) {
                          return null;
                        }
                        return (
                          <li
                            className={styles.reviewOption}
                            key={option}
                            data-state={isCorrect ? "good" : "bad"}
                          >
                            <span className={styles.reviewMark}>
                              {isCorrect ? "✓" : "✗"}
                            </span>
                            {option}
                            {isPicked && !isCorrect ? " — ваш ответ" : ""}
                          </li>
                        );
                      })}
                    </ul>
                    <p className={styles.reviewExplanation}>
                      {question.explanation}
                    </p>
                  </li>
                );
              })}
            </ol>
          </section>
        </>
      ) : null}
    </main>
  );
};
