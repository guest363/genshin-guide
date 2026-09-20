import type { CharacterSource } from "../../lib/character";
import { describeSource } from "../../lib/source-display";
import styles from "./source-list.module.css";

type SourceListProps = {
  sources: CharacterSource[];
};

export const SourceList = ({ sources }: SourceListProps) => (
  <ul className={styles.list}>
    {sources.map((source) => {
      const card = describeSource(source);
      return (
        <li className={styles.item} data-kind={card.kind} key={source.url}>
          <a className={styles.card} href={card.url} rel="noreferrer" target="_blank">
            <p className={styles.kind}>{card.kind}</p>
            <p className={styles.title}>{card.title}</p>
            <p className={styles.hint}>{card.hint}</p>
            <p className={styles.host}>{card.host}</p>
            <span className={styles.action}>{card.action}</span>
          </a>
        </li>
      );
    })}
  </ul>
);
