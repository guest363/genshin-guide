import type { CharacterImage, CharacterStep, WeaponId } from "../../lib/character";
import { WeaponSign } from "../weapon-sign";
import styles from "./guide-path.module.css";

type GuidePathProps = {
  steps: CharacterStep[];
  portrait?: CharacterImage;
  weapon: WeaponId;
  weaponLabel: string;
};

const KIND_META: Record<string, { kicker: string; mark: string }> = {
  role: { kicker: "Роль в бою", mark: "I" },
  artifacts: { kicker: "Артефакты", mark: "II" },
  team: { kicker: "Отряд", mark: "III" },
  rotation: { kicker: "Ротация", mark: "IV" },
};

const RelicMark = () => (
  <svg className={styles.glyph} viewBox="0 0 64 64" aria-hidden="true">
    <path d="M32 6l18 10v22L32 58 14 38V16z" fill="none" stroke="currentColor" strokeWidth="2" />
    <circle cx="32" cy="30" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M32 6v12" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const TeamMark = () => (
  <svg className={styles.glyph} viewBox="0 0 64 64" aria-hidden="true">
    <circle cx="32" cy="18" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
    <circle cx="16" cy="42" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
    <circle cx="48" cy="42" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M20 56c1-7 6-11 12-11s11 4 12 11" fill="none" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const CycleMark = () => (
  <svg className={styles.glyph} viewBox="0 0 64 64" aria-hidden="true">
    <path
      d="M14 32a18 18 0 0 1 30-12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path d="M44 12v10h-10" fill="none" stroke="currentColor" strokeWidth="2" />
    <path
      d="M50 32a18 18 0 0 1-30 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path d="M20 52V42h10" fill="none" stroke="currentColor" strokeWidth="2" />
  </svg>
);

export const GuidePath = ({
  steps,
  portrait,
  weapon,
  weaponLabel,
}: GuidePathProps) => (
  <ol className={styles.path}>
    {steps.map((step, index) => {
      const meta = KIND_META[step.id] ?? {
        kicker: `Шаг ${index + 1}`,
        mark: String(index + 1),
      };
      return (
        <li className={styles.card} data-kind={step.id} key={step.id}>
          <div className={styles.visual} aria-hidden="true">
            {step.id === "role" && portrait ? (
              <img className={styles.portrait} src={portrait.url} alt="" />
            ) : null}
            {step.id === "artifacts" ? <RelicMark /> : null}
            {step.id === "team" ? <TeamMark /> : null}
            {step.id === "rotation" ? <CycleMark /> : null}
            {step.id === "role" && !portrait ? (
              <WeaponSign weapon={weapon} label={weaponLabel} />
            ) : null}
            {step.id !== "role" &&
            step.id !== "artifacts" &&
            step.id !== "team" &&
            step.id !== "rotation" ? (
              <WeaponSign weapon={weapon} label={weaponLabel} />
            ) : null}
            <span className={styles.mark}>{meta.mark}</span>
          </div>
          <div className={styles.copy}>
            <p className={styles.kicker}>{meta.kicker}</p>
            <h3 className={styles.title}>{step.title.replace(/^Шаг \d+\.\s*/, "")}</h3>
            <p className={styles.body}>{step.body}</p>
          </div>
        </li>
      );
    })}
  </ol>
);
