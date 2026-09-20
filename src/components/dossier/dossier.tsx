import type { CharacterRecord } from "../../lib/character";
import { cn } from "../../lib/cn";
import {
  DOSSIER_SECTIONS,
  clampStepIndex,
  nextStepIndex,
  previousStepIndex,
  stepsForSection,
  type DossierSectionId,
} from "../../lib/step-navigation";
import styles from "./dossier.module.css";

type DossierProps = {
  character: CharacterRecord;
  section: DossierSectionId;
  stepIndex: number;
  onSection: (section: DossierSectionId) => void;
  onStep: (index: number) => void;
};

export const Dossier = ({
  character,
  section,
  stepIndex,
  onSection,
  onStep,
}: DossierProps) => {
  const steps = stepsForSection(character, section);
  const index = clampStepIndex(stepIndex, steps.length);
  const current = steps[index];

  if (!current) {
    return <p>Для этого раздела нет шагов.</p>;
  }

  return (
    <section className={styles.shell} aria-label="Раздел персонажа">
      <div className={styles.sections}>
        {DOSSIER_SECTIONS.map((item) => (
          <button
            className={cn(
              styles.section,
              item.id === section && styles.sectionActive,
            )}
            key={item.id}
            type="button"
            onClick={() => onSection(item.id)}
          >
            {item.title}
          </button>
        ))}
      </div>
      <article className={styles.panel}>
        <p className={styles.progress}>
          Шаг {index + 1} из {steps.length}
        </p>
        <h2 className={styles.heading}>{current.title}</h2>
        <p className={styles.body}>{current.body}</p>
        <div className={styles.dots} aria-label="Шаги раздела">
          {steps.map((step, stepNumber) => (
            <button
              className={cn(styles.dot, stepNumber === index && styles.dotActive)}
              key={step.id}
              type="button"
              aria-label={step.title}
              onClick={() => onStep(stepNumber)}
            />
          ))}
        </div>
        <div className={styles.nav}>
          <button
            className={styles.navButton}
            type="button"
            disabled={index === 0}
            onClick={() => onStep(previousStepIndex(index, steps.length))}
          >
            Назад
            <span className={styles.icon} aria-hidden="true">
              ←
            </span>
          </button>
          <button
            className={styles.navButton}
            type="button"
            disabled={index >= steps.length - 1}
            onClick={() => onStep(nextStepIndex(index, steps.length))}
          >
            Дальше
            <span className={styles.icon} aria-hidden="true">
              →
            </span>
          </button>
        </div>
      </article>
    </section>
  );
};
