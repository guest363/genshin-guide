import { Link } from "react-router-dom";
import styles from "./archive-header.module.css";

type ArchiveHeaderProps = {
  visible: number;
  total: number;
};

const SPARKS: Array<{ cx: number; cy: number; fill: string }> = [
  { cx: 60, cy: 12, fill: "var(--pyro)" },
  { cx: 101, cy: 32, fill: "var(--hydro)" },
  { cx: 108, cy: 78, fill: "var(--anemo)" },
  { cx: 78, cy: 112, fill: "var(--electro)" },
  { cx: 32, cy: 108, fill: "var(--dendro)" },
  { cx: 8, cy: 68, fill: "var(--cryo)" },
  { cx: 22, cy: 28, fill: "var(--geo)" },
];

export const ArchiveHeader = ({ visible, total }: ArchiveHeaderProps) => (
  <header className={styles.masthead}>
    <p className={styles.kicker}>Семь стихий · играбельные герои</p>
    <div className={styles.astrolabe} aria-hidden="true">
      <svg className={styles.sky} viewBox="0 0 120 120">
        <g className={styles.spin}>
          <circle className={styles.orbit} cx="60" cy="60" r="46" />
          <circle className={styles.orbitInner} cx="60" cy="60" r="26" />
          {SPARKS.map((spark) => (
            <circle
              key={spark.fill}
              cx={spark.cx}
              cy={spark.cy}
              r="5"
              fill={spark.fill}
            />
          ))}
        </g>
        <path
          className={styles.star}
          d="M60 44l4 12h12l-10 8 4 12-10-7-10 7 4-12-10-8h12z"
        />
      </svg>
    </div>
    <div className={styles.copy}>
      <h1 className={styles.title}>
        <Link className={styles.brand} to="/">
          Архив
          <span>Тейвата</span>
        </Link>
      </h1>
      <p className={styles.lead}>
        Откройте карточку: история, навыки и короткий гайд. В архиве только те,
        кем можно играть.
      </p>
    </div>
    <div className={styles.ledger}>
      <span className={styles.num}>{visible}</span>
      <span className={styles.numHint}>из {total} в архиве</span>
      <Link className={styles.lab} to="/reakcii">
        Лаборатория реакций →
      </Link>
      <Link className={styles.lab} to="/victorina">
        Викторина →
      </Link>
    </div>
  </header>
);
