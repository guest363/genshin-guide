import { useEffect, useRef } from "react";
import type { ElementId } from "../../lib/character";
import { createScene, type PointerPos } from "./scenes";
import styles from "./element-aura.module.css";

type ElementAuraProps = {
  element: ElementId;
};

export const ElementAura = ({ element }: ElementAuraProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    let width = 0;
    let height = 0;
    const fit = () => {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      if (width === 0 || height === 0) {
        return;
      }
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();

    const scene = createScene(element, ctx, width || window.innerWidth, height || window.innerHeight);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let last = performance.now();
    let elapsed = 0;

    const pointer: PointerPos = {
      x: width * 0.5,
      y: height * 0.5,
      active: false,
    };

    const onPointerMove = (e: MouseEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.active = true;
    };

    const onPointerLeave = () => {
      pointer.active = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        pointer.x = touch.clientX;
        pointer.y = touch.clientY;
        pointer.active = true;
      }
    };

    const onTouchEnd = () => {
      pointer.active = false;
    };

    window.addEventListener("mousemove", onPointerMove);
    document.addEventListener("mouseleave", onPointerLeave);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);

    const paint = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      elapsed += dt;
      ctx.clearRect(0, 0, width, height);
      scene.step(dt, elapsed, pointer);
    };

    const loop = (now: number) => {
      paint(now);
      frame = requestAnimationFrame(loop);
    };

    const observer = new ResizeObserver(() => {
      fit();
      scene.resize(width, height);
    });
    observer.observe(canvas);

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else {
        sync();
      }
    };

    const sync = () => {
      if (reduced.matches) {
        if (frame) {
          cancelAnimationFrame(frame);
          frame = 0;
        }
        for (let i = 1; i <= 30; i += 1) {
          paint(last + i * 33);
        }
        last = performance.now();
        elapsed += 1;
      } else if (!frame) {
        last = performance.now();
        frame = requestAnimationFrame(loop);
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    reduced.addEventListener("change", sync);
    sync();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("mousemove", onPointerMove);
      document.removeEventListener("mouseleave", onPointerLeave);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("visibilitychange", onVisibility);
      reduced.removeEventListener("change", sync);
    };
  }, [element]);

  return (
    <div className={styles.aura} data-element={element} aria-hidden="true">
      <div className={styles.wash} />
      <div className={styles.washAlt} />
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
};
