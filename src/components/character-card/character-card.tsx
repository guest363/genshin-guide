import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Link } from "react-router-dom";
import type { CharacterRecord } from "../../lib/character";
import { cn } from "../../lib/cn";
import { ArchonSign } from "../archon-sign";
import { ElementSparks } from "../element-sparks";
import styles from "./character-card.module.css";

type CharacterCardProps = {
  character: CharacterRecord;
};

type TiltSample = {
  clientX: number;
  clientY: number;
};

const REST_TRANSFORM =
  "perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)";
const LEAVE_MS = 400;
const SURFACE_TRANSITION =
  "box-shadow 280ms var(--ease), border-color 280ms var(--ease)";
const TRACK_TRANSITION = `transform 0s, ${SURFACE_TRANSITION}`;
const LEAVE_TRANSITION = `transform ${LEAVE_MS}ms cubic-bezier(0.2, 0, 0, 1), ${SURFACE_TRANSITION}`;

const motionOk = (): boolean =>
  typeof window === "undefined" ||
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const canTilt = (pointerType: string): boolean =>
  pointerType !== "touch" && motionOk();

const paintTilt = (
  node: HTMLElement,
  transform: string,
  mouseX: string,
  mouseY: string,
) => {
  node.style.transform = transform;
  node.style.setProperty("--mouse-x", mouseX);
  node.style.setProperty("--mouse-y", mouseY);
};

const paintFollow = (node: HTMLElement, clientX: number, clientY: number) => {
  const rect = node.getBoundingClientRect();
  const px = rect.width === 0 ? 0.5 : (clientX - rect.left) / rect.width;
  const py = rect.height === 0 ? 0.5 : (clientY - rect.top) / rect.height;
  const rotateX = (py - 0.5) * -24;
  const rotateY = (px - 0.5) * 24;
  paintTilt(
    node,
    `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-14px)`,
    `${(px * 100).toFixed(2)}%`,
    `${(py * 100).toFixed(2)}%`,
  );
};

export const CharacterCard = ({ character }: CharacterCardProps) => {
  const [live, setLive] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const sampleRef = useRef<TiltSample | null>(null);
  const frameRef = useRef(0);
  const leaveTimerRef = useRef(0);
  const art =
    character.images.find((image) => image.id === "splash") ??
    character.images.find((image) => image.id === "icon") ??
    character.images[0];

  const stopFrame = () => {
    if (frameRef.current !== 0) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    }
  };

  const flushTilt = () => {
    frameRef.current = 0;
    const node = cardRef.current;
    const sample = sampleRef.current;
    if (!node || !sample) {
      return;
    }
    paintFollow(node, sample.clientX, sample.clientY);
  };

  const onPointerEnter = (event: PointerEvent<HTMLDivElement>) => {
    window.clearTimeout(leaveTimerRef.current);
    leaveTimerRef.current = 0;
    event.currentTarget.style.transition = TRACK_TRANSITION;
    setLive(true);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!canTilt(event.pointerType)) {
      return;
    }
    event.currentTarget.style.transition = TRACK_TRANSITION;
    sampleRef.current = { clientX: event.clientX, clientY: event.clientY };
    if (frameRef.current === 0) {
      frameRef.current = requestAnimationFrame(flushTilt);
    }
  };

  const onPointerLeave = () => {
    sampleRef.current = null;
    stopFrame();
    setLive(false);
    const node = cardRef.current;
    if (!node) {
      return;
    }
    node.style.transition = motionOk() ? LEAVE_TRANSITION : "none";
    paintTilt(node, REST_TRANSFORM, "50%", "50%");
    window.clearTimeout(leaveTimerRef.current);
    leaveTimerRef.current = window.setTimeout(() => {
      if (cardRef.current) {
        cardRef.current.style.transition = "";
      }
      leaveTimerRef.current = 0;
    }, LEAVE_MS);
  };

  useEffect(
    () => () => {
      if (frameRef.current !== 0) {
        cancelAnimationFrame(frameRef.current);
      }
      window.clearTimeout(leaveTimerRef.current);
    },
    [],
  );

  return (
    <div className={styles.scene}>
      <div
        ref={cardRef}
        className={styles.card}
        data-element={character.element}
        data-rarity={character.rarity}
        data-archon={character.archon ? "true" : undefined}
        onPointerMove={onPointerMove}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onPointerCancel={onPointerLeave}
      >
        <Link className={styles.hit} to={`/personazh/${character.slug}`}>
          <span className={styles.glare} aria-hidden="true" />
          <span className={styles.rim} aria-hidden="true" />
          {art ? (
            <span className={styles.frame}>
              <img
                className={styles.portrait}
                src={art.url}
                alt={art.alt}
                loading="lazy"
                width={320}
                height={400}
              />
              {character.archon ? (
                <span className={styles.archonSlot}>
                  <ArchonSign />
                </span>
              ) : null}
              {live ? <ElementSparks element={character.element} /> : null}
              <span className={styles.shade} />
            </span>
          ) : null}
          <article className={styles.meta}>
            <h2 className={styles.name}>{character.name}</h2>
            <p className={styles.title}>{character.title}</p>
            <div className={styles.chips}>
              <span
                className={cn(styles.chip, styles.chipElement)}
                data-element={character.element}
              >
                {character.elementLabel}
              </span>
              <span className={styles.chip}>{character.rarity}★</span>
              <span className={styles.chip}>{character.weaponLabel}</span>
            </div>
          </article>
        </Link>
      </div>
    </div>
  );
};
