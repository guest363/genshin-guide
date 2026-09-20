import { useState } from "react";
import { Link } from "react-router-dom";
import { ElementAura } from "../../components/element-aura";
import { ReactionArena } from "../../components/reaction-arena";
import {
  CODEX,
  ELEMENT_LABELS,
  matchCodex,
  type CodexGroup,
  type ReactionElement,
  type ReactionResult,
} from "../../lib/reactions";
import styles from "./reactions-page.module.css";

const GROUP_TITLES: Record<CodexGroup, string> = {
  amplify: "Усиливающие",
  transform: "Трансформирующие",
  dendro: "Дендро",
  lunar: "Лунные",
  stellar: "Звёздные",
};

const GROUP_HINTS: Record<CodexGroup, string> = {
  amplify: "не наносят урон сами, умножают следующий удар",
  transform: "наносят урон своим стихиям",
  dendro: "работают через ядра и пробуждение",
  lunar: "пассивки «Лунного знамения» превращают Гидро-реакции в Лунные",
  stellar: "пассивки «Звёздного блеска» превращают Крио-реакции в Звёздные",
};

const MARKER_TITLES: Record<string, string> = {
  element: "любая стихия",
  core: "ядро цветения",
  awakened: "пробуждение",
  moon: "нужно Лунное знамение",
  veil: "эффект Лунной пелены",
  star: "нужен Звёздный блеск",
};

const ElementDot = ({ element }: { element: ReactionElement }) => (
  <span
    className={styles.dot}
    data-element={element}
    title={ELEMENT_LABELS[element]}
    aria-label={ELEMENT_LABELS[element]}
  />
);

export const ReactionsPage = () => {
  const [last, setLast] = useState<ReactionResult | null>(null);
  const active = last ? matchCodex(last) : undefined;

  const groups: CodexGroup[] = ["amplify", "transform", "dendro", "lunar", "stellar"];

  return (
    <main className={styles.page}>
      <ElementAura element="adaptive" />
      <div className={styles.bar}>
        <Link className={styles.back} to="/">
          ← Архив
        </Link>
        <p className={styles.crumb}>Лаборатория стихий</p>
      </div>

      <header className={styles.head}>
        <h1 className={styles.title}>Реакции</h1>
        <p className={styles.lead}>
          Наложите стихию на сгусток, затем добавьте вторую — сгусток ответит
          реакцией. Под ареной видно, что на нём висит, а в карточке реакции —
          что останется после. Порядок важен у Пара и Таяния, ядра Цветения
          ждут Пиро или Электро, а тумблеры «Лунное знамение» и «Звёздный
          блеск» включают реакции Нод-Края и Снежной.
        </p>
      </header>

      <div className={styles.layout}>
        <ReactionArena onReact={setLast} />

        <aside className={styles.codex} aria-label="Кодекс реакций">
          <p className={styles.codexKicker}>Кодекс</p>
          {groups.map((group) => (
            <section key={group} className={styles.group}>
              <h2 className={styles.groupTitle}>
                {GROUP_TITLES[group]}
                <span className={styles.groupHint}>{GROUP_HINTS[group]}</span>
              </h2>
              <ul className={styles.list}>
                {CODEX.filter((entry) => entry.group === group).map((entry) => {
                  const lit = active?.code === entry.code;
                  return (
                    <li
                      key={entry.code}
                      className={styles.entry}
                      data-lit={lit || undefined}
                    >
                      <span className={styles.entryDots}>
                        {entry.marker === "core" ? (
                          <span className={styles.coreDot} title="ядро цветения" />
                        ) : null}
                        {entry.marker === "moon" ? (
                          <span className={styles.moonDot} title={MARKER_TITLES.moon}>☾</span>
                        ) : null}
                        {entry.marker === "veil" ? (
                          <span className={styles.veilDot} title={MARKER_TITLES.veil}>◆</span>
                        ) : null}
                        {entry.marker === "star" ? (
                          <span className={styles.starDot} title={MARKER_TITLES.star}>✦</span>
                        ) : null}
                        {entry.elements.map((element) => (
                          <ElementDot key={element} element={element} />
                        ))}
                        {entry.marker === "awakened" ? (
                          <span className={styles.awakeDot} title="пробуждение" />
                        ) : null}
                        {entry.marker === "element" ? (
                          <span className={styles.anyDot} title="любая стихия">
                            ∗
                          </span>
                        ) : null}
                      </span>
                      <span className={styles.entryName}>{entry.name}</span>
                      <span className={styles.entryText}>{entry.text}</span>
                      {entry.after ? (
                        <span className={styles.entryAfter}>после: {entry.after}</span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </aside>
      </div>
    </main>
  );
};
