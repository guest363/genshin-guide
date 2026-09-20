import type { CharacterImage, CharacterStep } from "../../lib/character";
import type { StoryArtKind, StoryLayout } from "../../lib/story-display";
import styles from "./story-chapter.module.css";

type StoryChapterProps = {
  step: CharacterStep;
  art?: CharacterImage;
  layout: StoryLayout;
  kind?: StoryArtKind;
  kicker: string;
};

const isVideo = (url: string): boolean => url.endsWith(".mp4");

const sameWord = (left: string, right: string): boolean =>
  left.trim().toLowerCase() === right.trim().toLowerCase();

export const StoryChapter = ({
  step,
  art,
  layout,
  kind,
  kicker,
}: StoryChapterProps) => (
  <article className={styles.chapter} data-layout={layout} data-kind={kind}>
    {art ? (
      <figure className={styles.media}>
        {isVideo(art.url) ? (
          <video
            className={styles.frame}
            src={art.url}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          />
        ) : (
          <img className={styles.frame} src={art.url} alt={art.alt} loading="lazy" />
        )}
      </figure>
    ) : null}
    <div className={styles.copy}>
      {sameWord(kicker, step.title) ? null : (
        <p className={styles.kicker}>{kicker}</p>
      )}
      <h3 className={styles.title}>{step.title}</h3>
      <p className={styles.body}>{step.body}</p>
    </div>
  </article>
);
