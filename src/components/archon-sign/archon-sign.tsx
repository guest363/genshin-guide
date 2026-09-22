import styles from "./archon-sign.module.css";

type ArchonSignProps = {
  /** Печать на портрете крупнее и с ореолом, звезда в чипе фильтра — маленькая. */
  variant?: "seal" | "star";
};

export const ArchonSign = ({ variant = "seal" }: ArchonSignProps) =>
  variant === "star" ? (
    <svg
      className={styles.star}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 1.6c.9 6 3.9 9.1 10.4 10.4-6.5 1.3-9.5 4.4-10.4 10.4-.9-6-3.9-9.1-10.4-10.4C8.1 10.7 11.1 7.6 12 1.6Z" />
    </svg>
  ) : (
    <span className={styles.seal}>
      <span className={styles.halo} aria-hidden="true" />
      <svg
        className={styles.star}
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M12 1.6c.9 6 3.9 9.1 10.4 10.4-6.5 1.3-9.5 4.4-10.4 10.4-.9-6-3.9-9.1-10.4-10.4C8.1 10.7 11.1 7.6 12 1.6Z" />
      </svg>
      Архонт
    </span>
  );
