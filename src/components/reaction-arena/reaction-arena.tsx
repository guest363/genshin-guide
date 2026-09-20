import { useEffect, useRef, useState } from "react";
import { createArena, type Arena } from "./arena-engine";
import {
  applyElement,
  EMPTY_FIELD,
  EMPTY_STATE,
  ELEMENT_LABELS,
  MAX_CORES,
  REACTION_ELEMENTS,
  type AuraState,
  type FieldState,
  type ReactionElement,
  type ReactionResult,
} from "../../lib/reactions";
import styles from "./reaction-arena.module.css";

type ReactionArenaProps = {
  onReact: (result: ReactionResult | null) => void;
};

type Plate = {
  key: number;
  result: ReactionResult | null | undefined;
};

/** Сколько висит плашка реакции — на телефоне нужно больше времени прочитать. */
const PLATE_MS = 3400;

type Chip = {
  key: string;
  label: string;
  element?: ReactionElement;
  count?: string;
};

const buildChips = (target: AuraState, field: FieldState): Chip[] => {
  const chips: Chip[] = [];
  if (target.aura && target.aura === "hydro" && target.ec === "electro") {
    chips.push({ key: "aura-ec", label: "Гидро + Электро", element: "electro" });
  } else if (target.aura && target.aura === "electro" && target.ec === "hydro") {
    chips.push({ key: "aura-ec", label: "Электро + Гидро", element: "hydro" });
  } else if (target.aura) {
    chips.push({ key: "aura", label: ELEMENT_LABELS[target.aura], element: target.aura });
  }
  if (target.frozen) {
    chips.push({ key: "frozen", label: "Лёд", element: "cryo" });
  }
  if (target.burning) {
    chips.push({ key: "burning", label: "Горение", element: "pyro" });
  }
  if (target.quicken) {
    chips.push({ key: "quicken", label: "Пробуждение", element: "dendro" });
  }
  if (target.cores > 0) {
    chips.push({ key: "cores", label: "Ядра", count: `${target.cores}/${MAX_CORES}`, element: "dendro" });
  }
  if (target.dew > 0) {
    chips.push({ key: "dew", label: "Роса", count: `${target.dew}/3`, element: "dendro" });
  }
  if (field.cloud) {
    chips.push({ key: "cloud", label: "Туча", element: "electro" });
  }
  if (field.veils > 0) {
    chips.push({ key: "veils", label: "Пелены", count: `${field.veils}`, element: "geo" });
  }
  if (field.prism) {
    chips.push({ key: "prism", label: "Призма", element: "cryo" });
  }
  if (field.vortex > 0) {
    chips.push({ key: "vortex", label: `Вихрь ур.${field.vortex}`, count: `${field.vortexCount}/6`, element: "anemo" });
  }
  return chips;
};

export const ReactionArena = ({ onReact }: ReactionArenaProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const arenaRef = useRef<Arena | null>(null);
  const targetRef = useRef<AuraState>(EMPTY_STATE);
  const fieldRef = useRef<FieldState>(EMPTY_FIELD);
  const plateTimer = useRef(0);
  const [selected, setSelected] = useState<ReactionElement | null>(null);
  const [plate, setPlate] = useState<Plate | null>(null);
  const [lunar, setLunar] = useState(false);
  const [stellar, setStellar] = useState(false);
  const [chips, setChips] = useState<Chip[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const arena = createArena(canvas);
    arenaRef.current = arena;
    return () => {
      arena.destroy();
      arenaRef.current = null;
      window.clearTimeout(plateTimer.current);
    };
  }, []);

  const syncVisual = () => {
    arenaRef.current?.setVisual({
      ...targetRef.current,
      ...fieldRef.current,
    });
    setChips(buildChips(targetRef.current, fieldRef.current));
  };

  const showPlate = (result: ReactionResult | null) => {
    window.clearTimeout(plateTimer.current);
    setPlate({ key: Date.now(), result });
    plateTimer.current = window.setTimeout(() => setPlate(null), PLATE_MS);
  };

  const cast = (clientX: number, clientY: number) => {
    const arena = arenaRef.current;
    if (!arena || !selected) {
      return;
    }
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const outcome = applyElement(
      targetRef.current,
      fieldRef.current,
      selected,
      { lunar, stellar },
    );
    targetRef.current = outcome.target;
    fieldRef.current = outcome.field;
    arena.cast(selected, x, y);
    syncVisual();
    if (outcome.reaction) {
      arena.play(outcome.reaction.code);
      showPlate(outcome.reaction);
      onReact(outcome.reaction);
    } else if (!outcome.applied) {
      arena.fizzle();
      showPlate(null);
      onReact(null);
    } else {
      setPlate(null);
      onReact(null);
    }
  };

  const castFromKeyboard = () => {
    if (!selected) {
      return;
    }
    const rect = canvasRef.current!.getBoundingClientRect();
    cast(rect.left + rect.width / 2, rect.top + rect.height * 0.3);
  };

  const clearAura = () => {
    targetRef.current = EMPTY_STATE;
    fieldRef.current = EMPTY_FIELD;
    syncVisual();
    window.clearTimeout(plateTimer.current);
    setPlate({ key: Date.now(), result: undefined });
    plateTimer.current = window.setTimeout(() => setPlate(null), PLATE_MS);
    onReact(null);
  };

  const statusLine = plate?.result
    ? plate.result.note
    : selected
      ? `Коснитесь сгустка, чтобы наложить ${ELEMENT_LABELS[selected].toLowerCase()}`
      : "Выберите стихию ниже и коснитесь сгустка";

  return (
    <div className={styles.shell}>
      <div
        className={styles.stage}
        data-selected={selected ?? undefined}
        role="button"
        tabIndex={0}
        aria-label="Наложить выбранную стихию на сгусток"
        onPointerDown={(event) => cast(event.clientX, event.clientY)}
        onPointerMove={(event) => {
          const rect = canvasRef.current?.getBoundingClientRect();
          if (!rect) {
            return;
          }
          arenaRef.current?.pointer(
            event.clientX - rect.left,
            event.clientY - rect.top,
            selected,
          );
        }}
        onPointerLeave={() => arenaRef.current?.pointer(0, 0, null)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            castFromKeyboard();
          }
        }}
      >
        <canvas ref={canvasRef} className={styles.canvas} />
        {plate && plate.result ? (
          <div key={plate.key} className={styles.plate} style={{ color: plate.result.accent }}>
            <span className={styles.plateName}>{plate.result.name}</span>
            <span className={styles.plateNote}>{plate.result.note}</span>
            {plate.result.residue ? (
              <span className={styles.plateResidue}>остаётся: {plate.result.residue}</span>
            ) : null}
          </div>
        ) : null}
        {plate && plate.result === null ? (
          <div key={plate.key} className={`${styles.plate} ${styles.plateMute}`}>
            <span className={styles.plateName}>Нет реакции</span>
          </div>
        ) : null}
        {plate && plate.result === undefined ? (
          <div key={plate.key} className={`${styles.plate} ${styles.plateMute}`}>
            <span className={styles.plateNote}>сгусток очищен</span>
          </div>
        ) : null}
      </div>

      <div className={styles.dock}>
        <div
          className={styles.readout}
          aria-label="Что наложено на сгусток"
          aria-live="polite"
        >
          {chips.length === 0 ? (
            <span className={styles.readoutEmpty}>сгусток чист</span>
          ) : (
            chips.map((chip) => (
              <span
                key={chip.key}
                className={styles.chip}
                data-element={chip.element ?? undefined}
              >
                {chip.label}
                {chip.count ? <b className={styles.chipCount}>{chip.count}</b> : null}
              </span>
            ))
          )}
        </div>

        <div className={styles.palette} role="group" aria-label="Стихии">
          {REACTION_ELEMENTS.map((element) => (
            <button
              key={element}
              type="button"
              className={styles.element}
              data-element={element}
              data-active={selected === element || undefined}
              aria-pressed={selected === element}
              onClick={() =>
                setSelected((current) => (current === element ? null : element))
              }
            >
              <span className={styles.orb} aria-hidden="true" />
              <span className={styles.elementLabel}>{ELEMENT_LABELS[element]}</span>
            </button>
          ))}
          <button
            type="button"
            className={styles.sign}
            data-sign="lunar"
            data-on={lunar || undefined}
            aria-pressed={lunar}
            title="Пассивки «Лунного знамения» превращают Гидро-реакции в Лунные"
            onClick={() => {
              setLunar((v) => !v);
              syncVisual();
            }}
          >
            <span className={styles.signGlyph} aria-hidden="true">☾</span>
            Лунное знамение
          </button>
          <button
            type="button"
            className={styles.sign}
            data-sign="stellar"
            data-on={stellar || undefined}
            aria-pressed={stellar}
            title="Пассивки «Звёздного блеска» превращают Крио-реакции в Звёздные"
            onClick={() => {
              setStellar((v) => !v);
              syncVisual();
            }}
          >
            <span className={styles.signGlyph} aria-hidden="true">✦</span>
            Звёздный блеск
          </button>
          <button type="button" className={styles.wash} onClick={clearAura}>
            Смыть
          </button>
        </div>
        <p className={styles.signHints}>
          <span>☾ Лунное знамение — Гидро-реакции становятся Лунными</span>
          <span>✦ Звёздный блеск — Крио-реакции становятся Звёздными</span>
        </p>
        <p className={styles.status} aria-live="polite">
          {statusLine}
        </p>
      </div>
    </div>
  );
};
