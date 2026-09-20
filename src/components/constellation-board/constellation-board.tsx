import { useState } from "react";
import type { CharacterStep } from "../../lib/character";
import { splitHeading } from "../../lib/talent-display";
import styles from "./constellation-board.module.css";

type ConstellationBoardProps = {
  name: string;
  steps: CharacterStep[];
};

const POINTS: Array<[number, number]> = [
  [72, 46],
  [148, 22],
  [228, 48],
  [86, 118],
  [196, 112],
  [142, 172],
];

const LINES: Array<[number, number]> = [
  [0, 1],
  [1, 2],
  [0, 3],
  [1, 4],
  [3, 5],
  [4, 5],
  [2, 4],
];

export const ConstellationBoard = ({ name, steps }: ConstellationBoardProps) => {
  const [active, setActive] = useState(0);

  return (
    <div className={styles.board}>
      <div className={styles.skyWrap}>
        <svg className={styles.sky} viewBox="0 0 280 200" aria-hidden="true">
          {LINES.map(([from, to]) => {
            const start = POINTS[from];
            const end = POINTS[to];
            if (!start || !end) {
              return null;
            }
            const lit = active === from || active === to;
            return (
              <line
                key={`${from}-${to}`}
                x1={start[0]}
                y1={start[1]}
                x2={end[0]}
                y2={end[1]}
                className={lit ? styles.edgeLit : styles.edge}
              />
            );
          })}
          {POINTS.map((point, index) => (
            <g key={index}>
              <circle
                className={index === active ? styles.starLit : styles.star}
                cx={point[0]}
                cy={point[1]}
                r={index === active ? 13 : 11}
              />
              <text x={point[0]} y={point[1] + 4} textAnchor="middle">
                {index + 1}
              </text>
            </g>
          ))}
        </svg>
        <div className={styles.starButtons}>
          {steps.map((step, index) => (
            <button
              className={styles.starHit}
              data-active={index === active}
              key={step.id}
              type="button"
              onClick={() => setActive(index)}
            >
              C{index + 1}
            </button>
          ))}
        </div>
        <p className={styles.caption}>Созвездие «{name}»</p>
      </div>
      <ol className={styles.list}>
        {steps.map((step, index) => {
          const heading = splitHeading(step.title);
          return (
            <li
              className={styles.item}
              data-active={index === active}
              key={step.id}
            >
              <button
                className={styles.itemHit}
                type="button"
                onClick={() => setActive(index)}
              >
                <span className={styles.iconWrap}>
                  {step.iconUrl ? (
                    <img className={styles.icon} src={step.iconUrl} alt="" />
                  ) : (
                    <span className={styles.index}>C{index + 1}</span>
                  )}
                </span>
                <span className={styles.copy}>
                  <span className={styles.rank}>Уровень {index + 1}</span>
                  <span className={styles.title}>{heading.name}</span>
                  <span className={styles.body}>{step.body}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
