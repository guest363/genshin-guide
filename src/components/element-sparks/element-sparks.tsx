import { useEffect, useRef } from "react";
import type { ElementId } from "../../lib/character";
import styles from "./element-sparks.module.css";

type ElementSparksProps = {
  element: ElementId;
};

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  angle: number;
  spin: number;
  color: string;
};

const COLORS: Record<ElementId, string[]> = {
  pyro: ["#ff4d00", "#ff7733", "#ffa64d", "#ff3300"],
  hydro: ["#00aaff", "#33ccff", "#80dfff", "#0088ff"],
  anemo: ["#2dd4bf", "#5eead4", "#99f6e4", "#14b8a6"],
  electro: ["#a855f7", "#c084fc", "#e9d5ff", "#9333ea"],
  dendro: ["#84cc16", "#a3e635", "#bef264", "#65a30d"],
  cryo: ["#9fe7ff", "#c8f4ff", "#7ad7ff", "#e8fbff"],
  geo: ["#e6c15a", "#f5d76e", "#c9a227", "#ffe9a3"],
  adaptive: ["#d7c4ff", "#c4b5fd", "#a78bfa", "#f5d0fe"],
};

const spawn = (element: ElementId, width: number, height: number): Spark => {
  const palette = COLORS[element];
  const color = palette[Math.floor(Math.random() * palette.length)] ?? palette[0];
  const spark: Spark = {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.8,
    vy: (Math.random() - 0.5) * 0.8,
    size: 1.6 + Math.random() * 3.2,
    life: 0,
    maxLife: 50 + Math.random() * 70,
    angle: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.06,
    color: color ?? "#d4b56a",
  };
  if (element === "pyro") {
    spark.vy = -(0.9 + Math.random() * 1.6);
    spark.vx = (Math.random() - 0.5) * 0.55;
    spark.y = height + 4;
  } else if (element === "cryo") {
    spark.vy = 0.55 + Math.random() * 1.1;
    spark.vx = (Math.random() - 0.5) * 0.7;
    spark.y = -4;
  } else if (element === "anemo") {
    spark.vx = 1.1 + Math.random() * 1.4;
    spark.vy = -0.35 + (Math.random() - 0.5) * 0.8;
    spark.x = -4;
  } else if (element === "hydro") {
    spark.vy = -(0.45 + Math.random() * 0.85);
    spark.vx = Math.sin(Math.random() * 5) * 0.4;
  } else if (element === "electro") {
    spark.vx = (Math.random() - 0.5) * 2.6;
    spark.vy = (Math.random() - 0.5) * 2.6;
  } else if (element === "dendro") {
    spark.vx = (Math.random() - 0.5) * 0.9;
    spark.vy = -(0.3 + Math.random() * 0.6);
  } else if (element === "geo") {
    spark.vx = (Math.random() - 0.5) * 0.35;
    spark.vy = -(0.2 + Math.random() * 0.45);
  }
  return spark;
};

const paint = (
  ctx: CanvasRenderingContext2D,
  spark: Spark,
  element: ElementId,
  alpha: number,
) => {
  ctx.save();
  ctx.translate(spark.x, spark.y);
  ctx.rotate(spark.angle);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = spark.color;
  ctx.shadowColor = spark.color;
  ctx.shadowBlur = 8;
  if (element === "cryo" || element === "geo") {
    ctx.beginPath();
    ctx.moveTo(0, -spark.size * 1.4);
    ctx.lineTo(spark.size, 0);
    ctx.lineTo(0, spark.size * 1.4);
    ctx.lineTo(-spark.size, 0);
    ctx.closePath();
    ctx.fill();
  } else if (element === "anemo" || element === "dendro") {
    ctx.beginPath();
    ctx.ellipse(0, 0, spark.size * 1.3, spark.size * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (element === "electro") {
    ctx.strokeStyle = spark.color;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-spark.size, -spark.size);
    ctx.lineTo(0, 0);
    ctx.lineTo(spark.size, -spark.size * 0.4);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, spark.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};

export const ElementSparks = ({ element }: ElementSparksProps) => {
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

    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);
    let frame = 0;
    const sparks: Spark[] = [];
    for (let index = 0; index < 20; index += 1) {
      sparks.push(spawn(element, width, height));
    }

    const tick = () => {
      ctx.clearRect(0, 0, width, height);
      for (let index = 0; index < sparks.length; index += 1) {
        const spark = sparks[index];
        if (!spark) {
          continue;
        }
        spark.life += 1;
        spark.x += spark.vx;
        spark.y += spark.vy;
        spark.angle += spark.spin;
        if (
          spark.life >= spark.maxLife ||
          spark.x < -12 ||
          spark.x > width + 12 ||
          spark.y < -12 ||
          spark.y > height + 12
        ) {
          sparks[index] = spawn(element, width, height);
          continue;
        }
        const fade = Math.sin((spark.life / spark.maxLife) * Math.PI);
        paint(ctx, spark, element, fade * 0.85);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    const observer = new ResizeObserver(() => {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    });
    observer.observe(canvas);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [element]);

  return (
    <div className={styles.layer} aria-hidden="true">
      <canvas className={styles.canvas} ref={canvasRef} />
    </div>
  );
};
