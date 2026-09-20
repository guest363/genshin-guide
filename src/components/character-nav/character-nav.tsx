import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import styles from "./character-nav.module.css";

export type CharacterNavLink = {
  id: string;
  label: string;
};

type CharacterNavProps = {
  name: string;
  links: CharacterNavLink[];
};

const scrollToSection = (id: string) => {
  const node = document.getElementById(id);
  if (!node) {
    return;
  }
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  node.scrollIntoView({
    behavior: reduceMotion ? "auto" : "smooth",
    block: "start",
  });
};

export const CharacterNav = ({ name, links }: CharacterNavProps) => {
  const [open, setOpen] = useState(false);
  const barRef = useRef<HTMLElement | null>(null);
  const burgerRef = useRef<HTMLButtonElement | null>(null);
  const firstLinkRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        burgerRef.current?.focus();
      }
    };
    const onPointer = (event: PointerEvent) => {
      if (barRef.current && !barRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    firstLinkRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 821px)");
    const onChange = () => {
      if (desktop.matches) {
        setOpen(false);
      }
    };
    desktop.addEventListener("change", onChange);
    return () => desktop.removeEventListener("change", onChange);
  }, []);

  const jump = (id: string) => {
    setOpen(false);
    scrollToSection(id);
  };

  return (
    <nav ref={barRef} className={styles.bar} aria-label="Навигация карточки">
      <Link className={styles.back} to="/">
        ← Архив
      </Link>
      <p className={styles.name}>{name}</p>
      <button
        ref={burgerRef}
        className={styles.burger}
        type="button"
        data-open={open}
        aria-label={open ? "Закрыть меню разделов" : "Открыть меню разделов"}
        aria-expanded={open}
        aria-controls="character-sections"
        onClick={() => setOpen((value) => !value)}
      >
        <span />
        <span />
        <span />
      </button>
      <div className={styles.links}>
        {links.map((link) => (
          <button
            className={styles.link}
            key={link.id}
            type="button"
            onClick={() => scrollToSection(link.id)}
          >
            {link.label}
          </button>
        ))}
      </div>
      {open ? (
        <div className={styles.menu} id="character-sections">
          {links.map((link, index) => (
            <button
              ref={index === 0 ? firstLinkRef : undefined}
              key={link.id}
              type="button"
              onClick={() => jump(link.id)}
            >
              {link.label}
            </button>
          ))}
        </div>
      ) : null}
    </nav>
  );
};
