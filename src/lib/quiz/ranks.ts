/** Лестница уровня знаний: суммарный процент лучших попыток по всем тестам. */
export type KnowledgeRank = {
  min: number;
  title: string;
  hint: string;
};

export const KNOWLEDGE_RANKS: KnowledgeRank[] = [
  { min: 0, title: "Безымянный путник", hint: "Архив ждёт первого ответа" },
  { min: 20, title: "Искатель приключений", hint: "Путь по Тейвату начат" },
  { min: 40, title: "Знаток Тейвата", hint: "Семь регионов вам по плечу" },
  { min: 60, title: "Летописец", hint: "Истории внадёжно записаны" },
  { min: 80, title: "Мудрец Академии", hint: "Академия Сумеру аплодирует" },
  { min: 95, title: "Архонт знаний", hint: "Небеса засчитали трон" },
];

export const rankForPercent = (percent: number): KnowledgeRank => {
  let current = KNOWLEDGE_RANKS[0]!;
  for (const rank of KNOWLEDGE_RANKS) {
    if (percent >= rank.min) {
      current = rank;
    }
  }
  return current;
};

/** Следующий ранг или null, если достигнут последний. */
export const nextRank = (percent: number): KnowledgeRank | null => {
  const current = rankForPercent(percent);
  return KNOWLEDGE_RANKS[KNOWLEDGE_RANKS.indexOf(current) + 1] ?? null;
};

/** Прогресс 0…1 внутри текущего ранга (до границы следующего). */
export const rankProgress = (percent: number): number => {
  const current = rankForPercent(percent);
  const next = nextRank(percent);
  if (!next || next.min === current.min) {
    return 1;
  }
  return Math.min(1, (percent - current.min) / (next.min - current.min));
};
