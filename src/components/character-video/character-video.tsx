import type { CharacterVideo as CharacterVideoItem } from "../../lib/character";
import styles from "./character-video.module.css";

type CharacterVideoProps = {
  video: CharacterVideoItem;
};

export const CharacterVideo = ({ video }: CharacterVideoProps) => (
  <figure className={styles.frame}>
    <div className={styles.ratio}>
      <iframe
        className={styles.player}
        src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?rel=0`}
        title={video.title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
      />
    </div>
    <figcaption className={styles.caption}>{video.title}</figcaption>
  </figure>
);
