import { useEffect, useRef, useState } from "react";
import type { CharacterStep } from "../../lib/character";
import { splitHeading, summarizeTalent } from "../../lib/talent-display";
import styles from "./talent-card.module.css";

type TalentCardProps = {
  step: CharacterStep;
};

const isGif = (url: string): boolean => url.endsWith(".gif");

const isWebp = (url: string): boolean => url.endsWith(".webp");

const isMp4 = (url: string): boolean => url.endsWith(".mp4");

const firstMatch = (
  urls: Array<string | undefined>,
  test: (url: string) => boolean,
): string | undefined => {
  for (const url of urls) {
    if (url && test(url)) {
      return url;
    }
  }
  return undefined;
};

const LoopingVideo = ({
  src,
  poster,
}: {
  src: string;
  poster?: string;
}) => {
  const nodeRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) {
      return;
    }
    node.muted = true;
    const play = () => {
      void node.play().catch(() => undefined);
    };
    play();
    node.addEventListener("canplay", play);
    return () => {
      node.removeEventListener("canplay", play);
    };
  }, [src]);

  return (
    <video
      ref={nodeRef}
      className={styles.clip}
      src={src}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
    />
  );
};

export const TalentCard = ({ step }: TalentCardProps) => {
  const [open, setOpen] = useState(false);
  const heading = splitHeading(step.title);
  const summary = summarizeTalent(step.body);
  const fullBody = step.body.trim();
  const hasMore = fullBody !== summary;
  const sources = [step.previewGif, step.previewVideo];
  const gif = firstMatch(sources, isGif);
  const video = gif ? undefined : firstMatch(sources, isMp4);
  const picture = gif ?? (video ? undefined : firstMatch(sources, isWebp));

  return (
    <article className={styles.card}>
      {picture || video ? (
        <div className={styles.media}>
          {picture ? (
            <img className={styles.clip} src={picture} alt="" />
          ) : video ? (
            <LoopingVideo src={video} poster={step.previewPoster} />
          ) : null}
        </div>
      ) : null}
      <div className={styles.copy}>
        <div className={styles.topline}>
          {step.iconUrl ? (
            <img className={styles.icon} src={step.iconUrl} alt="" />
          ) : null}
          <div>
            {heading.kind ? <p className={styles.kind}>{heading.kind}</p> : null}
            <h3 className={styles.name}>{heading.name}</h3>
          </div>
        </div>
        <p className={styles.summary}>{open ? fullBody : summary}</p>
        {hasMore ? (
          <button
            className={styles.more}
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "Свернуть" : "Читать полностью"}
          </button>
        ) : null}
      </div>
    </article>
  );
};
