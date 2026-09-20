import type { ElementId } from "../../lib/character";
import {
  drawGlow,
  glowSprite,
  rgba,
  spriteCache,
  type Rgb,
} from "../../lib/glow-sprites";

export type PointerPos = {
  x: number; // in pixels
  y: number; // in pixels
  active: boolean;
};

export type Scene = {
  resize: (width: number, height: number) => void;
  step: (dt: number, time: number, pointer?: PointerPos) => void;
};

const TAU = Math.PI * 2;

const rand = (min: number, max: number): number =>
  min + Math.random() * (max - min);

/**
 * 4-pointed or N-pointed diamond star
 */
const drawStar = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerRadius: number,
  innerRadius: number,
) => {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i += 1) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
};

/**
 * Baked 6-pointed snowflake sprite (Cryo): one drawImage per flake instead
 * of 18 strokes.
 */
const snowflakeSprite = (): HTMLCanvasElement => {
  const cacheKey = "snowflake";
  const cached = spriteCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const size = 128;
  const sprite = document.createElement("canvas");
  sprite.width = size;
  sprite.height = size;
  const g = sprite.getContext("2d");
  if (g) {
    g.translate(size / 2, size / 2);
    g.strokeStyle = "#e0f7fa";
    g.lineCap = "round";
    g.lineWidth = 4;
    const radius = 52;
    for (let i = 0; i < 6; i += 1) {
      g.save();
      g.rotate((i * Math.PI) / 3);
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(0, radius);
      g.stroke();
      for (const [b, bLen] of [
        [radius * 0.45, radius * 0.32],
        [radius * 0.75, radius * 0.24],
      ] as const) {
        g.beginPath();
        g.moveTo(-bLen, b - bLen * 0.6);
        g.lineTo(0, b);
        g.lineTo(bLen, b - bLen * 0.6);
        g.stroke();
      }
      g.restore();
    }
    g.fillStyle = "#ffffff";
    g.beginPath();
    g.arc(0, 0, 9, 0, TAU);
    g.fill();
  }
  spriteCache.set(cacheKey, sprite);
  return sprite;
};

/**
 * Baked bubble sprite (Hydro): body gradient, rim and highlight in one image.
 */
const bubbleSprite = (): HTMLCanvasElement => {
  const cacheKey = "bubble";
  const cached = spriteCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const size = 96;
  const sprite = document.createElement("canvas");
  sprite.width = size;
  sprite.height = size;
  const g = sprite.getContext("2d");
  if (g) {
    const r = 40;
    g.translate(size / 2, size / 2);
    const grad = g.createRadialGradient(-r * 0.3, -r * 0.3, 1, 0, 0, r);
    grad.addColorStop(0, "rgba(224, 242, 254, 0.45)");
    grad.addColorStop(0.5, "rgba(56, 189, 248, 0.2)");
    grad.addColorStop(0.9, "rgba(2, 132, 199, 0.4)");
    grad.addColorStop(1, "rgba(125, 211, 252, 0.8)");
    g.fillStyle = grad;
    g.beginPath();
    g.arc(0, 0, r, 0, TAU);
    g.fill();
    g.strokeStyle = "rgba(186, 230, 253, 0.8)";
    g.lineWidth = 2.6;
    g.stroke();
    g.fillStyle = "rgba(255, 255, 255, 0.9)";
    g.beginPath();
    g.ellipse(-r * 0.38, -r * 0.38, r * 0.28, r * 0.16, -Math.PI / 4, 0, TAU);
    g.fill();
  }
  spriteCache.set(cacheKey, sprite);
  return sprite;
};

/**
 * Baked wind-mote sprite (Anemo): soft gradient ellipse.
 */
const moteSprite = (): HTMLCanvasElement => {
  const cacheKey = "mote";
  const cached = spriteCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const sprite = document.createElement("canvas");
  sprite.width = 96;
  sprite.height = 32;
  const g = sprite.getContext("2d");
  if (g) {
    g.translate(48, 16);
    const grad = g.createLinearGradient(-44, 0, 44, 0);
    grad.addColorStop(0, "rgba(94, 234, 212, 0.1)");
    grad.addColorStop(0.5, "#5eead4");
    grad.addColorStop(1, "#99f6e4");
    g.fillStyle = grad;
    g.beginPath();
    g.ellipse(0, 0, 44, 13, 0, 0, TAU);
    g.fill();
  }
  spriteCache.set(cacheKey, sprite);
  return sprite;
};

/**
 * 3D Isometric Basalt Geo Cube
 */
const drawGeoCube = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  angle: number,
  alpha: number,
) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha = alpha;

  const w = size;
  const h = size * 0.58;
  const depth = size * 0.95;

  // Top Face (Radiant gold)
  ctx.beginPath();
  ctx.moveTo(0, -h);
  ctx.lineTo(w, 0);
  ctx.lineTo(0, h);
  ctx.lineTo(-w, 0);
  ctx.closePath();
  ctx.fillStyle = "rgba(254, 240, 138, 0.85)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Left Face (Warm amber)
  ctx.beginPath();
  ctx.moveTo(-w, 0);
  ctx.lineTo(0, h);
  ctx.lineTo(0, h + depth);
  ctx.lineTo(-w, depth);
  ctx.closePath();
  ctx.fillStyle = "rgba(217, 119, 6, 0.75)";
  ctx.fill();
  ctx.strokeStyle = "rgba(245, 158, 11, 0.75)";
  ctx.stroke();

  // Right Face (Deep bronze basalt)
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(w, 0);
  ctx.lineTo(w, depth);
  ctx.lineTo(0, h + depth);
  ctx.closePath();
  ctx.fillStyle = "rgba(180, 83, 9, 0.8)";
  ctx.fill();
  ctx.strokeStyle = "rgba(245, 158, 11, 0.75)";
  ctx.stroke();

  ctx.restore();
};

/**
 * 3D Tumbling Leaf (Dendro)
 */
const leafGradients = new Map<number, CanvasGradient>();

const drawLeaf = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  yaw: number,
  pitch: number,
  roll: number,
  alpha: number,
) => {
  let grad = leafGradients.get(size);
  if (!grad) {
    grad = ctx.createLinearGradient(0, -size * 1.5, 0, size * 1.5);
    grad.addColorStop(0, "#bef264");
    grad.addColorStop(0.5, "#84cc16");
    grad.addColorStop(1, "#15803d");
    leafGradients.set(size, grad);
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(yaw);
  const scaleX = Math.cos(pitch);
  const scaleY = Math.sin(roll) || 0.85;
  ctx.scale(scaleX, scaleY);
  ctx.globalAlpha = Math.max(0.18, alpha * Math.abs(scaleX));

  ctx.beginPath();
  ctx.moveTo(0, -size * 1.5);
  ctx.bezierCurveTo(size * 0.8, -size * 0.8, size * 0.9, size * 0.8, 0, size * 1.5);
  ctx.bezierCurveTo(-size * 0.9, size * 0.8, -size * 0.8, -size * 0.8, 0, -size * 1.5);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = "rgba(254, 240, 138, 0.65)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -size * 1.3);
  ctx.lineTo(0, size * 1.3);
  ctx.stroke();

  ctx.restore();
};

/**
 * Procedural Branching Lightning (Electro)
 */
const drawLightning = (
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  depth: number,
  maxDev: number,
) => {
  if (depth === 0) {
    ctx.lineTo(x2, y2);
    return;
  }
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const dx = y2 - y1;
  const dy = x1 - x2;
  const len = Math.hypot(dx, dy) || 1;
  const nx = dx / len;
  const ny = dy / len;
  const offset = rand(-maxDev, maxDev);
  const cx = midX + nx * offset;
  const cy = midY + ny * offset;

  drawLightning(ctx, x1, y1, cx, cy, depth - 1, maxDev * 0.55);
  drawLightning(ctx, cx, cy, x2, y2, depth - 1, maxDev * 0.55);

  if (depth === 2 && Math.random() < 0.45) {
    const forkX = cx + nx * rand(-30, 30);
    const forkY = cy + ny * rand(10, 40);
    ctx.moveTo(cx, cy);
    ctx.lineTo(forkX, forkY);
    ctx.moveTo(cx, cy);
  }
};

export const createScene = (
  element: ElementId,
  ctx: CanvasRenderingContext2D,
  initWidth: number,
  initHeight: number,
): Scene => {
  let width = initWidth;
  let height = initHeight;

  // =========================================================================
  // 1. PYRO (Огненный шторм, восходящие угли, языки пламени, искры)
  // =========================================================================
  if (element === "pyro") {
    type Ember = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      life: number;
      maxLife: number;
      seed: number;
      color: Rgb;
      isSpark: boolean;
    };

    const COLORS: Rgb[] = [
      [255, 255, 255],
      [255, 245, 157],
      [255, 202, 40],
      [255, 152, 0],
      [255, 87, 34],
      [230, 74, 25],
      [216, 69, 21],
    ];
    let embers: Ember[] = [];

    const spawnEmber = (): Ember => {
      const isSpark = Math.random() < 0.4;
      const colorIndex = Math.floor(Math.random() * COLORS.length);
      return {
        x: rand(-20, width + 20),
        y: height + rand(10, 50),
        vx: rand(-1.2, 1.2),
        vy: isSpark ? -rand(2.8, 5.5) : -rand(1.2, 3.2),
        size: isSpark ? rand(1.5, 3.2) : rand(4.0, 10.0),
        life: 0,
        maxLife: rand(60, 120),
        seed: rand(0, 100),
        color: COLORS[colorIndex] ?? [255, 87, 34],
        isSpark,
      };
    };

    const count = 130;
    for (let i = 0; i < count; i += 1) {
      const e = spawnEmber();
      e.y = rand(0, height);
      e.life = rand(0, e.maxLife * 0.8);
      embers.push(e);
    }

    return {
      resize: (w, h) => {
        width = w;
        height = h;
      },
      step: (dt, time, pointer) => {
        const k = Math.min(dt * 60, 3);
        ctx.save();
        ctx.globalCompositeOperation = "lighter";

        // Base fire wash / heat glow
        const glowRad = width * 0.65;
        const glowGrad = ctx.createRadialGradient(
          width * 0.5,
          height + 30,
          20,
          width * 0.5,
          height + 30,
          glowRad,
        );
        const pulse = Math.sin(time * 3) * 0.06;
        glowGrad.addColorStop(0, `rgba(255, 87, 34, ${0.4 + pulse})`);
        glowGrad.addColorStop(0.4, "rgba(255, 152, 0, 0.15)");
        glowGrad.addColorStop(1, "rgba(255, 87, 34, 0)");
        ctx.fillStyle = glowGrad;
        ctx.fillRect(0, height - glowRad * 0.7, width, glowRad * 0.7);

        for (let i = 0; i < embers.length; i += 1) {
          const e = embers[i]!;
          e.life += k;
          e.x += (e.vx + Math.sin(time * 2.5 + e.seed) * 1.5) * k;
          e.y += e.vy * k;

          if (pointer && pointer.active) {
            const dx = e.x - pointer.x;
            const dy = e.y - pointer.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 100 && dist > 1) {
              const force = (1 - dist / 100) * 2.5 * k;
              e.x += (dx / dist) * force;
              e.y += (dy / dist) * force - 0.8 * k;
            }
          }

          if (e.life >= e.maxLife || e.y < -30 || e.x < -30 || e.x > width + 30) {
            const next = spawnEmber();
            next.color = e.color;
            embers[i] = next;
            continue;
          }

          const progress = e.life / e.maxLife;
          const alpha = Math.sin(progress * Math.PI) * (e.isSpark ? 0.95 : 0.85);

          // Halo via cached glow sprite, then the shape itself — no shadowBlur
          drawGlow(
            ctx,
            glowSprite(e.color),
            e.x,
            e.y,
            e.size * (e.isSpark ? 6 : 5),
            alpha * 0.8,
          );

          ctx.save();
          ctx.translate(e.x, e.y);
          ctx.globalAlpha = alpha;
          ctx.fillStyle = rgba(e.color, 0.95);

          if (e.isSpark) {
            drawStar(ctx, 0, 0, 4, e.size * 1.8, e.size * 0.4);
            ctx.fill();
          } else {
            // Teardrop flame
            ctx.beginPath();
            ctx.moveTo(0, -e.size * 1.5);
            ctx.quadraticCurveTo(e.size, 0, 0, e.size);
            ctx.quadraticCurveTo(-e.size, 0, 0, -e.size * 1.5);
            ctx.fill();
          }
          ctx.restore();
        }

        ctx.restore();
      },
    };
  }

  // =========================================================================
  // 2. HYDRO (Океаническая глубина, перламутровые пузыри, волны и брызги)
  // =========================================================================
  if (element === "hydro") {
    type Bubble = {
      x: number;
      y: number;
      vy: number;
      size: number;
      wobbleSpeed: number;
      seed: number;
    };

    type Droplet = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
    };

    type Ripple = {
      x: number;
      y: number;
      radius: number;
      maxRadius: number;
      alpha: number;
    };

    let bubbles: Bubble[] = [];
    let droplets: Droplet[] = [];
    let ripples: Ripple[] = [];
    const bubblesSprite = bubbleSprite();

    const spawnBubble = (): Bubble => ({
      x: rand(15, width - 15),
      y: height + rand(10, 40),
      vy: rand(0.8, 2.2),
      size: rand(5.0, 20.0),
      wobbleSpeed: rand(1.2, 2.8),
      seed: rand(0, 100),
    });

    const popBubble = (b: Bubble) => {
      ripples.push({
        x: b.x,
        y: b.y,
        radius: b.size * 0.6,
        maxRadius: b.size * 3.2,
        alpha: 0.85,
      });
      const count = Math.floor(rand(5, 8));
      for (let k2 = 0; k2 < count; k2 += 1) {
        const angle = (k2 / count) * TAU + rand(-0.3, 0.3);
        const speed = rand(1.8, 3.8);
        droplets.push({
          x: b.x,
          y: b.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.8,
          size: rand(1.5, 3.2),
          alpha: 0.95,
        });
      }
    };

    for (let i = 0; i < 180; i += 1) {
      const b = spawnBubble();
      b.y = rand(0, height);
      bubbles.push(b);
    }

    return {
      resize: (w, h) => {
        width = w;
        height = h;
      },
      step: (dt, time, pointer) => {
        const k = Math.min(dt * 60, 3);
        ctx.save();

        // 1. Water Caustic Rays from top
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const rayCount = 6;
        for (let r = 0; r < rayCount; r += 1) {
          const rx = (width * (r + 0.5)) / rayCount + Math.sin(time * 0.5 + r) * 40;
          const rayGrad = ctx.createLinearGradient(rx, 0, rx + 60, height * 0.75);
          rayGrad.addColorStop(0, "rgba(56, 189, 248, 0.12)");
          rayGrad.addColorStop(1, "rgba(2, 132, 199, 0)");
          ctx.fillStyle = rayGrad;
          ctx.beginPath();
          ctx.moveTo(rx - 50, 0);
          ctx.lineTo(rx + 50, 0);
          ctx.lineTo(rx + 140, height * 0.75);
          ctx.lineTo(rx - 30, height * 0.75);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();

        // 2. Expanding ripples
        for (let i = ripples.length - 1; i >= 0; i -= 1) {
          const r = ripples[i]!;
          r.radius += 1.1 * k;
          r.alpha *= Math.pow(0.94, k);
          if (r.alpha < 0.02 || r.radius > r.maxRadius) {
            ripples.splice(i, 1);
            continue;
          }
          ctx.strokeStyle = `rgba(125, 211, 252, ${r.alpha})`;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.ellipse(r.x, r.y, r.radius, r.radius * 0.55, 0, 0, TAU);
          ctx.stroke();
        }

        // 3. Droplets
        for (let i = droplets.length - 1; i >= 0; i -= 1) {
          const d = droplets[i]!;
          d.x += d.vx * k;
          d.y += d.vy * k;
          d.vy += 0.08 * k;
          d.alpha *= Math.pow(0.95, k);
          if (d.alpha < 0.03 || d.y > height + 20) {
            droplets.splice(i, 1);
            continue;
          }
          ctx.globalAlpha = d.alpha;
          ctx.fillStyle = "#38bdf8";
          ctx.beginPath();
          ctx.arc(d.x, d.y, d.size, 0, TAU);
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        // 4. Bubbles (baked sprite: gradient body + rim + highlight)
        for (let i = bubbles.length - 1; i >= 0; i -= 1) {
          const b = bubbles[i]!;
          b.y -= b.vy * k;
          b.x += Math.sin(time * b.wobbleSpeed + b.seed) * 0.9 * k;

          if (pointer && pointer.active) {
            const dist = Math.hypot(b.x - pointer.x, b.y - pointer.y);
            if (dist < b.size + 24) {
              popBubble(b);
              bubbles[i] = spawnBubble();
              continue;
            }
          }

          if (b.y < -25) {
            if (Math.random() < 0.25) {
              popBubble(b);
            }
            bubbles[i] = spawnBubble();
            continue;
          }

          const drawSize = (b.size / 40) * 96;
          ctx.drawImage(
            bubblesSprite,
            b.x - drawSize / 2,
            b.y - drawSize / 2,
            drawSize,
            drawSize,
          );
        }

        ctx.restore();
      },
    };
  }

  // =========================================================================
  // 3. ANEMO (Буйный вихрь, ветровые ленты, летящие перья и семена)
  // =========================================================================
  if (element === "anemo") {
    type Mote = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      length: number;
      angle: number;
      spin: number;
      alpha: number;
      maxAlpha: number;
    };

    let motes: Mote[] = [];
    const windSprite = moteSprite();

    const spawnMote = (): Mote => ({
      x: rand(-30, width * 0.4),
      y: rand(-20, height + 20),
      vx: rand(2.2, 4.8),
      vy: rand(-1.2, 0.6),
      length: rand(6.0, 15.0),
      angle: rand(0, TAU),
      spin: rand(-0.04, 0.04),
      alpha: 0,
      maxAlpha: rand(0.6, 0.95),
    });

    for (let i = 0; i < 110; i += 1) {
      const m = spawnMote();
      m.x = rand(0, width);
      m.alpha = rand(0.3, m.maxAlpha);
      motes.push(m);
    }

    return {
      resize: (w, h) => {
        width = w;
        height = h;
      },
      step: (dt, time, pointer) => {
        const k = Math.min(dt * 60, 3);
        ctx.save();
        ctx.globalCompositeOperation = "lighter";

        // Dynamic flowing wind ribbons across screen
        const ribbonCount = 5;
        for (let r = 0; r < ribbonCount; r += 1) {
          const t = time * (1.2 + r * 0.35);
          const startY = ((r * 220 + time * 60) % (height + 200)) - 100;
          ctx.beginPath();
          const startX = -30;
          ctx.moveTo(startX, startY);

          for (let seg = 1; seg <= 8; seg += 1) {
            const px = startX + (width + 60) * (seg / 8);
            const py = startY + Math.sin(t + seg * 0.8) * (35 + r * 12) - seg * 12;
            ctx.lineTo(px, py);
          }

          ctx.strokeStyle =
            r % 2 === 0 ? "rgba(94, 234, 212, 0.4)" : "rgba(45, 212, 191, 0.3)";
          ctx.lineWidth = 2.0 + (r % 2) * 1.5;
          ctx.stroke();
        }

        // Swirling wind motes (baked sprite)
        for (let i = motes.length - 1; i >= 0; i -= 1) {
          const m = motes[i]!;
          m.x += m.vx * k;
          m.y += (m.vy + Math.sin(time * 2.2 + m.x * 0.015) * 0.9) * k;
          m.angle += m.spin * k;

          if (pointer && pointer.active) {
            const dx = pointer.x - m.x;
            const dy = pointer.y - m.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 120 && dist > 1) {
              m.x += (-dy / dist) * 3.0 * k;
              m.y += (dx / dist) * 3.0 * k;
            }
          }

          m.alpha = Math.min(m.maxAlpha, m.alpha + 0.025 * k);

          if (m.x > width + 40 || m.y < -40 || m.y > height + 40) {
            motes[i] = spawnMote();
            continue;
          }

          const w = m.length * 2;
          const h = m.length * 0.64;
          ctx.save();
          ctx.translate(m.x, m.y);
          ctx.rotate(Math.atan2(m.vy, m.vx) + Math.sin(time * 3) * 0.2);
          ctx.globalAlpha = m.alpha;
          ctx.drawImage(windSprite, -w / 2, -h / 2, w, h);
          ctx.restore();
        }

        ctx.restore();
      },
    };
  }

  // =========================================================================
  // 4. ELECTRO (Грозовой шторм, ветвящиеся молнии, плазма, статические дуги)
  // =========================================================================
  if (element === "electro") {
    type Spark = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      life: number;
      maxLife: number;
    };

    let sparks: Spark[] = [];
    let lightningCooldown = 0;
    let activeBolts: Array<{
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      life: number;
    }> = [];
    const sparkGlow = glowSprite([168, 85, 247]);

    const spawnSpark = (): Spark => ({
      x: rand(0, width),
      y: rand(0, height),
      vx: rand(-1.1, 1.1),
      vy: rand(-1.1, 1.1),
      size: rand(2.5, 6.0),
      alpha: 1,
      life: 0,
      maxLife: rand(45, 90),
    });

    for (let i = 0; i < 90; i += 1) {
      sparks.push(spawnSpark());
    }

    return {
      resize: (w, h) => {
        width = w;
        height = h;
      },
      step: (dt, _time, pointer) => {
        const k = Math.min(dt * 60, 3);
        ctx.save();
        ctx.globalCompositeOperation = "lighter";

        // Lightning bolt periodic discharge
        lightningCooldown -= k;
        if (lightningCooldown <= 0) {
          lightningCooldown = rand(45, 95);
          const x1 =
            pointer && pointer.active && Math.random() < 0.6
              ? pointer.x
              : rand(width * 0.1, width * 0.9);
          const y1 =
            pointer && pointer.active && Math.random() < 0.6
              ? pointer.y
              : rand(0, height * 0.3);
          const x2 = rand(0, width);
          const y2 = rand(height * 0.5, height);
          activeBolts.push({ x1, y1, x2, y2, life: 8 });
        }

        // Draw lightning bolts
        for (let b = activeBolts.length - 1; b >= 0; b -= 1) {
          const bolt = activeBolts[b]!;
          bolt.life -= k;
          if (bolt.life <= 0) {
            activeBolts.splice(b, 1);
            continue;
          }

          const boltAlpha = bolt.life / 8;

          // Outer purple plasma glow
          ctx.strokeStyle = `rgba(192, 132, 252, ${boltAlpha * 0.9})`;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(bolt.x1, bolt.y1);
          drawLightning(ctx, bolt.x1, bolt.y1, bolt.x2, bolt.y2, 4, 32);
          ctx.stroke();

          // Inner white core
          ctx.strokeStyle = `rgba(255, 255, 255, ${boltAlpha})`;
          ctx.lineWidth = 1.8;
          ctx.stroke();
        }

        // Draw sparks and proximity arcs
        for (let i = sparks.length - 1; i >= 0; i -= 1) {
          const s = sparks[i]!;
          s.life += k;
          s.x += s.vx * k;
          s.y += s.vy * k;
          s.vx += rand(-0.3, 0.3) * k;
          s.vy += rand(-0.3, 0.3) * k;

          // Proximity static mini-arcs
          for (let j = i - 1; j >= 0; j -= 1) {
            const other = sparks[j]!;
            const dist = Math.hypot(s.x - other.x, s.y - other.y);
            if (dist < 55) {
              ctx.strokeStyle = `rgba(216, 180, 254, ${(1 - dist / 55) * 0.6})`;
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(s.x, s.y);
              ctx.lineTo(
                (s.x + other.x) / 2 + rand(-4, 4),
                (s.y + other.y) / 2 + rand(-4, 4),
              );
              ctx.lineTo(other.x, other.y);
              ctx.stroke();
            }
          }

          if (
            s.life >= s.maxLife ||
            s.x < -15 ||
            s.x > width + 15 ||
            s.y < -15 ||
            s.y > height + 15
          ) {
            sparks[i] = spawnSpark();
            continue;
          }

          const progress = s.life / s.maxLife;
          const alpha = Math.sin(progress * Math.PI);
          drawGlow(ctx, sparkGlow, s.x, s.y, s.size * 5, alpha * 0.9);
          ctx.save();
          ctx.translate(s.x, s.y);
          ctx.globalAlpha = alpha;
          ctx.fillStyle = "#f3e8ff";
          drawStar(ctx, 0, 0, 4, s.size * 1.8, s.size * 0.35);
          ctx.fill();
          ctx.restore();
        }

        ctx.restore();
      },
    };
  }

  // =========================================================================
  // 5. DENDRO (Лес Сумеру, 3D кувыркающиеся листья, споры, золотая пыльца)
  // =========================================================================
  if (element === "dendro") {
    type Foliage = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      yaw: number;
      pitch: number;
      roll: number;
      dYaw: number;
      dPitch: number;
      dRoll: number;
      alpha: number;
      isSpore: boolean;
      seed: number;
    };

    let foliage: Foliage[] = [];
    const sporeGlow = glowSprite([163, 230, 53], "spore");

    const spawnFoliage = (): Foliage => {
      const isSpore = Math.random() < 0.5;
      return {
        x: rand(0, width),
        y: isSpore ? height + rand(10, 30) : -rand(10, 30),
        vx: rand(-0.9, 0.9),
        vy: isSpore ? -rand(0.7, 1.8) : rand(0.9, 2.4),
        size: isSpore ? rand(3.0, 6.0) : rand(7.0, 16.0),
        yaw: rand(0, TAU),
        pitch: rand(0, TAU),
        roll: rand(0, TAU),
        dYaw: rand(-0.03, 0.03),
        dPitch: rand(-0.04, 0.04),
        dRoll: rand(-0.03, 0.03),
        alpha: rand(0.65, 0.95),
        isSpore,
        seed: rand(0, 100),
      };
    };

    for (let i = 0; i < 100; i += 1) {
      const f = spawnFoliage();
      f.y = rand(0, height);
      foliage.push(f);
    }

    return {
      resize: (w, h) => {
        width = w;
        height = h;
      },
      step: (dt, time, pointer) => {
        const k = Math.min(dt * 60, 3);
        ctx.save();

        for (let i = foliage.length - 1; i >= 0; i -= 1) {
          const f = foliage[i]!;
          f.x += (f.vx + Math.sin(time * 2 + f.seed) * 0.8) * k;
          f.y += f.vy * k;
          f.yaw += f.dYaw * k;
          f.pitch += f.dPitch * k;
          f.roll += f.dRoll * k;

          if (pointer && pointer.active) {
            const dist = Math.hypot(f.x - pointer.x, f.y - pointer.y);
            if (dist < 90) {
              f.x += (f.x - pointer.x) * 0.03 * k;
              f.y += (f.y - pointer.y) * 0.03 * k;
            }
          }

          if (f.y > height + 40 || f.y < -40 || f.x < -40 || f.x > width + 40) {
            foliage[i] = spawnFoliage();
            continue;
          }

          if (f.isSpore) {
            // Pulsing bioluminescent spore (baked glow sprite)
            const pulse = 1 + Math.sin(time * 3.5 + f.seed) * 0.28;
            const r = f.size * pulse;
            drawGlow(ctx, sporeGlow, f.x, f.y, r * 4.4, 0.85);
          } else {
            // 3D tumbling leaf
            drawLeaf(ctx, f.x, f.y, f.size, f.yaw, f.pitch, f.roll, f.alpha);
          }
        }

        ctx.restore();
      },
    };
  }

  // =========================================================================
  // 6. CRYO (Ледяная буря, 6-лучевые снежинки, алмазная пыль, кристаллы)
  // =========================================================================
  if (element === "cryo") {
    type Frost = {
      x: number;
      y: number;
      vy: number;
      vx: number;
      size: number;
      angle: number;
      spin: number;
      type: "snowflake" | "glint" | "shard";
      alpha: number;
      seed: number;
    };

    let frost: Frost[] = [];
    const flake = snowflakeSprite();
    const glintGlow = glowSprite([103, 232, 249]);

    const spawnFrost = (): Frost => {
      const r = Math.random();
      const type: Frost["type"] =
        r < 0.38 ? "snowflake" : r < 0.72 ? "glint" : "shard";
      return {
        x: rand(-20, width + 20),
        y: -rand(10, 30),
        vy: rand(0.8, 2.4),
        vx: rand(-0.5, 0.5),
        size:
          type === "snowflake"
            ? rand(8.0, 20.0)
            : type === "glint"
              ? rand(3.5, 7.0)
              : rand(5.0, 11.0),
        angle: rand(0, TAU),
        spin: rand(-0.02, 0.02),
        type,
        alpha: rand(0.65, 0.95),
        seed: rand(0, 100),
      };
    };

    for (let i = 0; i < 110; i += 1) {
      const f = spawnFrost();
      f.y = rand(0, height);
      frost.push(f);
    }

    return {
      resize: (w, h) => {
        width = w;
        height = h;
      },
      step: (dt, time, pointer) => {
        const k = Math.min(dt * 60, 3);
        ctx.save();
        ctx.globalCompositeOperation = "lighter";

        for (let i = frost.length - 1; i >= 0; i -= 1) {
          const f = frost[i]!;
          f.y += f.vy * k;
          f.x += (f.vx + Math.sin(time * 1.5 + f.seed) * 0.5) * k;
          f.angle += f.spin * k;

          if (pointer && pointer.active) {
            const dist = Math.hypot(f.x - pointer.x, f.y - pointer.y);
            if (dist < 80) {
              f.x += (f.x - pointer.x) * 0.04 * k;
              f.y += (f.y - pointer.y) * 0.04 * k;
            }
          }

          if (f.y > height + 35 || f.x < -35 || f.x > width + 35) {
            frost[i] = spawnFrost();
            continue;
          }

          if (f.type === "snowflake") {
            // Baked sprite, one drawImage per flake
            const drawSize = (f.size / 52) * 128;
            ctx.save();
            ctx.translate(f.x, f.y);
            ctx.rotate(f.angle);
            ctx.globalAlpha = f.alpha;
            ctx.drawImage(flake, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
            ctx.restore();
          } else if (f.type === "glint") {
            // Twinkling diamond dust
            const twinkle = Math.abs(Math.sin(time * 3 + f.seed));
            drawGlow(ctx, glintGlow, f.x, f.y, f.size * 4, f.alpha * twinkle * 0.8);
            ctx.save();
            ctx.translate(f.x, f.y);
            ctx.globalAlpha = f.alpha * twinkle;
            ctx.fillStyle = "#ffffff";
            drawStar(ctx, 0, 0, 4, f.size * 1.8, f.size * 0.35);
            ctx.fill();
            ctx.restore();
          } else {
            // Ice crystal shard
            ctx.save();
            ctx.translate(f.x, f.y);
            ctx.rotate(f.angle);
            ctx.globalAlpha = f.alpha;
            ctx.fillStyle = "rgba(165, 243, 252, 0.75)";
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, -f.size * 1.5);
            ctx.lineTo(f.size * 0.6, 0);
            ctx.lineTo(0, f.size * 1.5);
            ctx.lineTo(-f.size * 0.6, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          }
        }

        ctx.restore();
      },
    };
  }

  // =========================================================================
  // 7. GEO (Гео резонанс, 3D изометрические кубы, ромбы, янтарная пыль)
  // =========================================================================
  if (element === "geo") {
    type GeoConstruct = {
      x: number;
      y: number;
      size: number;
      vy: number;
      angle: number;
      spin: number;
      seed: number;
      isDust: boolean;
      alpha: number;
    };

    let constructs: GeoConstruct[] = [];
    let pulseRadius = 0;
    const dustGlow = glowSprite([245, 158, 11]);

    const spawnConstruct = (): GeoConstruct => {
      const isDust = Math.random() < 0.6;
      return {
        x: rand(20, width - 20),
        y: height + rand(10, 40),
        size: isDust ? rand(2.0, 4.5) : rand(12.0, 26.0),
        vy: isDust ? rand(0.6, 1.8) : rand(0.4, 1.0),
        angle: rand(0, TAU),
        spin: rand(-0.015, 0.015),
        seed: rand(0, 100),
        isDust,
        alpha: rand(0.7, 0.95),
      };
    };

    for (let i = 0; i < 90; i += 1) {
      const c = spawnConstruct();
      c.y = rand(0, height);
      constructs.push(c);
    }

    return {
      resize: (w, h) => {
        width = w;
        height = h;
      },
      step: (dt, time, pointer) => {
        const k = Math.min(dt * 60, 3);
        ctx.save();
        ctx.globalCompositeOperation = "lighter";

        // Geo Resonance Shockwave (expanding golden diamond)
        pulseRadius += 1.6 * k;
        const maxPulse = Math.hypot(width, height) * 0.6;
        if (pulseRadius > maxPulse) {
          pulseRadius = 0;
        }
        const pulseAlpha = Math.max(0, 1 - pulseRadius / maxPulse) * 0.35;
        ctx.save();
        ctx.translate(width * 0.5, height * 0.55);
        ctx.rotate(Math.PI / 4);
        ctx.strokeStyle = `rgba(251, 191, 36, ${pulseAlpha})`;
        ctx.lineWidth = 2.0;
        ctx.strokeRect(-pulseRadius, -pulseRadius, pulseRadius * 2, pulseRadius * 2);
        ctx.restore();

        for (let i = constructs.length - 1; i >= 0; i -= 1) {
          const c = constructs[i]!;
          c.y -= c.vy * k;
          c.x += Math.sin(time + c.seed) * 0.4 * k;
          c.angle += c.spin * k;

          if (pointer && pointer.active) {
            const dist = Math.hypot(c.x - pointer.x, c.y - pointer.y);
            if (dist < 80) {
              c.x += (c.x - pointer.x) * 0.03 * k;
              c.y += (c.y - pointer.y) * 0.03 * k;
            }
          }

          if (c.y < -40) {
            constructs[i] = spawnConstruct();
            continue;
          }

          if (c.isDust) {
            // Golden topaz dust mote
            drawGlow(ctx, dustGlow, c.x, c.y, c.size * 5, c.alpha * 0.8);
            ctx.save();
            ctx.translate(c.x, c.y);
            ctx.globalAlpha = c.alpha;
            ctx.fillStyle = "#fbbf24";
            drawStar(ctx, 0, 0, 4, c.size * 1.6, c.size * 0.4);
            ctx.fill();
            ctx.restore();
          } else {
            // 3D Isometric Basalt Geo Cube
            drawGeoCube(ctx, c.x, c.y, c.size, c.angle, c.alpha);
          }
        }

        ctx.restore();
      },
    };
  }

  // =========================================================================
  // 8. ADAPTIVE (Астральный космос, созвездия, спектральная пыль, метеоры)
  // =========================================================================
  type StarNode = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    seed: number;
    hue: number;
    sprite: HTMLCanvasElement;
  };

  type Meteor = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    length: number;
    life: number;
  };

  let stars: StarNode[] = [];
  let meteors: Meteor[] = [];

  // На узких экранах фон должен быть спокойным: меньше звёзд, без метеоров,
  // медленный дрейф и мерцание — контент лаборатории лежит прямо на сцене.
  const compact = width < 760;
  const starCount = compact ? 40 : 90;
  const linkDist = compact ? 74 : 95;
  const twinkleSpeed = compact ? 1.6 : 3;
  const drift = compact ? 0.22 : 0.5;

  const starSprite = (hue: number): HTMLCanvasElement => {
    // quantize hue so the sprite cache stays small
    const q = Math.round(hue / 10) * 10;
    return glowSprite(hslToRgb(q, 0.85, 0.75), `h${q}:`);
  };

  function hslToRgb(h: number, s: number, l: number): Rgb {
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
      const kk = (n + h / 30) % 12;
      return l - a * Math.max(-1, Math.min(kk - 3, Math.min(9 - kk, 1)));
    };
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
  }

  const spawnStar = (): StarNode => {
    const hue = rand(240, 320);
    return {
      x: rand(10, width - 10),
      y: rand(10, height - 10),
      vx: rand(-drift, drift),
      vy: rand(-drift, drift),
      size: rand(2.2, 4.8),
      seed: rand(0, 100),
      hue,
      sprite: starSprite(hue),
    };
  };

  for (let i = 0; i < starCount; i += 1) {
    stars.push(spawnStar());
  }

  return {
    resize: (w, h) => {
      width = w;
      height = h;
    },
    step: (dt, time, pointer) => {
      const k = Math.min(dt * 60, 3);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";

      // Spawn meteors (off on compact screens)
      if (!compact && Math.random() < 0.035 * k) {
        meteors.push({
          x: rand(0, width * 0.75),
          y: rand(0, height * 0.4),
          vx: rand(5.0, 9.0),
          vy: rand(3.0, 5.5),
          length: rand(45, 90),
          life: 1,
        });
      }

      // Draw meteors
      for (let m = meteors.length - 1; m >= 0; m -= 1) {
        const met = meteors[m]!;
        met.x += met.vx * k;
        met.y += met.vy * k;
        met.life -= 0.03 * k;
        if (met.life <= 0 || met.x > width + 60 || met.y > height + 60) {
          meteors.splice(m, 1);
          continue;
        }

        const angle = Math.atan2(met.vy, met.vx);
        const grad = ctx.createLinearGradient(
          met.x,
          met.y,
          met.x - Math.cos(angle) * met.length,
          met.y - Math.sin(angle) * met.length,
        );
        grad.addColorStop(0, `rgba(255, 255, 255, ${met.life})`);
        grad.addColorStop(0.3, `rgba(192, 132, 252, ${met.life * 0.75})`);
        grad.addColorStop(1, "rgba(99, 102, 241, 0)");

        ctx.strokeStyle = grad;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(met.x, met.y);
        ctx.lineTo(
          met.x - Math.cos(angle) * met.length,
          met.y - Math.sin(angle) * met.length,
        );
        ctx.stroke();
      }

      // Update positions
      for (const s of stars) {
        s.x += s.vx * k;
        s.y += s.vy * k;
        if (s.x < 10 || s.x > width - 10) {
          s.vx = -s.vx;
        }
        if (s.y < 10 || s.y > height - 10) {
          s.vy = -s.vy;
        }
      }

      // Draw constellation lines batched into a handful of alpha buckets
      // instead of one stroke per link
      const LINK_BUCKETS = 5;
      const linkPaths: Path2D[] = [];
      for (let b = 0; b < LINK_BUCKETS; b += 1) {
        linkPaths.push(new Path2D());
      }
      const pointerPath = new Path2D();
      let hasPointerLinks = false;

      for (let i = 0; i < stars.length; i += 1) {
        const s1 = stars[i]!;
        for (let j = i + 1; j < stars.length; j += 1) {
          const s2 = stars[j]!;
          const dist = Math.hypot(s1.x - s2.x, s1.y - s2.y);
          if (dist < linkDist) {
            const bucket = Math.min(
              LINK_BUCKETS - 1,
              Math.max(0, Math.floor((1 - dist / linkDist) * LINK_BUCKETS)),
            );
            linkPaths[bucket]!.moveTo(s1.x, s1.y);
            linkPaths[bucket]!.lineTo(s2.x, s2.y);
          }
        }

        // Connect to pointer
        if (pointer && pointer.active) {
          const distToCursor = Math.hypot(s1.x - pointer.x, s1.y - pointer.y);
          if (distToCursor < 120) {
            pointerPath.moveTo(s1.x, s1.y);
            pointerPath.lineTo(pointer.x, pointer.y);
            hasPointerLinks = true;
          }
        }
      }

      for (let b = 0; b < LINK_BUCKETS; b += 1) {
        ctx.strokeStyle = `rgba(192, 132, 252, ${(b + 0.5) / LINK_BUCKETS})`;
        ctx.lineWidth = 1;
        ctx.stroke(linkPaths[b]!);
      }
      if (hasPointerLinks) {
        ctx.strokeStyle = "rgba(254, 240, 138, 0.55)";
        ctx.lineWidth = 1.3;
        ctx.stroke(pointerPath);
      }

      // Draw stars (baked per-hue glow sprite + star core)
      for (const s of stars) {
        const twinkle = 0.5 + Math.sin(time * twinkleSpeed + s.seed) * 0.5;
        const size = s.size * (1 + twinkle * 0.5);
        drawGlow(ctx, s.sprite, s.x, s.y, size * 5, 0.55 + twinkle * 0.3);
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.fillStyle = `hsl(${s.hue}, 85%, 75%)`;
        drawStar(ctx, 0, 0, 4, size, s.size * 0.28);
        ctx.fill();
        ctx.restore();
      }

      ctx.restore();
    },
  };
};
