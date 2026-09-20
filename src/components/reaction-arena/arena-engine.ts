import type { ReactionElement } from "../../lib/reactions";
import { drawGlow, elementColor, glowSprite, type Rgb } from "../../lib/glow-sprites";

const TAU = Math.PI * 2;

const rand = (min: number, max: number): number =>
  min + Math.random() * (max - min);

export type ArenaVisual = {
  aura: ReactionElement | null;
  ec: ReactionElement | null;
  frozen: boolean;
  quicken: boolean;
  burning: boolean;
  cores: number;
  dew: number;
  cloud: boolean;
  veils: number;
  prism: boolean;
  vortex: 0 | 1 | 2;
};

type ParticleKind =
  | "glow"
  | "star"
  | "shard"
  | "flame"
  | "steam"
  | "spiral"
  | "pickup"
  | "bolt"
  | "petal"
  | "spark"
  | "rune"
  | "slash";

type Particle = {
  x: number;
  y: number;
  px: number;
  py: number;
  vx: number;
  vy: number;
  g: number;
  drag: number;
  age: number;
  maxLife: number;
  size: number;
  angle: number;
  spin: number;
  kind: ParticleKind;
  color: Rgb;
  alpha: number;
  // spiral state (polar around the orb)
  r: number;
  vr: number;
  w: number;
  // rune / slash geometry
  span: number;
};

type Shockwave = {
  x: number;
  y: number;
  r: number;
  vr: number;
  age: number;
  maxLife: number;
  color: Rgb;
  width: number;
};

type Beam = {
  x: number;
  y: number;
  age: number;
  maxLife: number;
  color: Rgb;
};

export type Arena = {
  setVisual: (visual: ArenaVisual) => void;
  cast: (element: ReactionElement, x: number, y: number) => void;
  pointer: (x: number, y: number, element: ReactionElement | null) => void;
  play: (code: string) => void;
  fizzle: () => void;
  refresh: () => void;
  destroy: () => void;
};

const drawStar4 = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outer: number,
  inner: number,
) => {
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const rad = i % 2 === 0 ? outer : inner;
    const a = (i / 8) * TAU - Math.PI / 2;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
};

const drawLeaf = (
  ctx: CanvasRenderingContext2D,
  size: number,
) => {
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.quadraticCurveTo(size * 0.75, 0, 0, size);
  ctx.quadraticCurveTo(-size * 0.75, 0, 0, -size);
  ctx.closePath();
};

export const createArena = (canvas: HTMLCanvasElement): Arena => {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("arena: no 2d context");
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
  let width = 0;
  let height = 0;

  // Пост-обработка: два понижающих прохода дают мягкий bloom без
  // дорогого blur — просто drawImage туда-обратно с усреднением.
  const bloomA = document.createElement("canvas");
  const bloomACtx = bloomA.getContext("2d");
  const bloomB = document.createElement("canvas");
  const bloomBCtx = bloomB.getContext("2d");
  // Предрендер фона: туманность и звёзды рисуются один раз на ресайз.
  const bg = document.createElement("canvas");
  const bgCtx = bg.getContext("2d");

  const renderBg = () => {
    bg.width = Math.max(1, Math.round(canvas.width));
    bg.height = Math.max(1, Math.round(canvas.height));
    if (!bgCtx) {
      return;
    }
    const g = bgCtx;
    const w = bg.width;
    const h = bg.height;
    g.clearRect(0, 0, w, h);
    g.fillStyle = "#070b16";
    g.fillRect(0, 0, w, h);
    const nebula = (
      cx: number,
      cy: number,
      r: number,
      color: string,
      alpha: number,
    ) => {
      const grad = g.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, color);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      g.globalAlpha = alpha;
      g.fillStyle = grad;
      g.fillRect(cx - r, cy - r, r * 2, r * 2);
      g.globalAlpha = 1;
    };
    nebula(w * 0.72, h * 0.24, Math.max(w, h) * 0.5, "rgb(64 48 120)", 0.32);
    nebula(w * 0.2, h * 0.78, Math.max(w, h) * 0.45, "rgb(34 66 110)", 0.3);
    nebula(w * 0.5, h * 0.5, Math.max(w, h) * 0.4, "rgb(96 74 140)", 0.14);
    for (let i = 0; i < 130; i += 1) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const s = Math.random() ** 2.6;
      const r = 0.6 + s * 2.2;
      g.globalAlpha = 0.25 + s * 0.75;
      g.fillStyle = Math.random() < 0.8 ? "#dfe6ff" : "#ffe9c9";
      g.beginPath();
      g.arc(x, y, r, 0, TAU);
      g.fill();
      if (s > 0.85) {
        g.globalAlpha = 0.45;
        g.strokeStyle = "#ffffff";
        g.lineWidth = 0.7;
        g.beginPath();
        g.moveTo(x - r * 3, y);
        g.lineTo(x + r * 3, y);
        g.moveTo(x, y - r * 3);
        g.lineTo(x, y + r * 3);
        g.stroke();
      }
    }
    g.globalAlpha = 1;
  };

  const fit = () => {
    width = canvas.offsetWidth;
    height = canvas.offsetHeight;
    if (width === 0 || height === 0) {
      return;
    }
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    bloomA.width = Math.max(1, Math.round(canvas.width / 2));
    bloomA.height = Math.max(1, Math.round(canvas.height / 2));
    bloomB.width = Math.max(1, Math.round(canvas.width / 4));
    bloomB.height = Math.max(1, Math.round(canvas.height / 4));
    renderBg();
  };
  fit();

  let visual: ArenaVisual = {
    aura: null,
    ec: null,
    frozen: false,
    quicken: false,
    burning: false,
    cores: 0,
    dew: 0,
    cloud: false,
    veils: 0,
    prism: false,
    vortex: 0,
  };

  const particles: Particle[] = [];
  const waves: Shockwave[] = [];
  const beams: Beam[] = [];
  let flameTimer = 0;
  let crackleTimer = 0;
  let ecTimer = 0;
  let boltTimer = 0;
  let snowTimer = 0;
  let vortexTimer = 0;
  let emberTimer = 0;
  let twinkleSeed = Math.random() * 100;

  // Экранная тряска и вспышка — «удар» тяжёлых реакций.
  let shakeMag = 0;
  let flashAlpha = 0;
  let flashColor: Rgb = [255, 255, 255];
  const shake = (mag: number) => {
    shakeMag = Math.min(14, Math.max(shakeMag, mag));
  };
  const flash = (color: Rgb, alpha = 0.3) => {
    flashColor = color;
    flashAlpha = Math.min(0.5, Math.max(flashAlpha, alpha));
  };

  const pointerPos = { x: -1, y: -1, element: null as ReactionElement | null };

  const center = () => ({ x: width * 0.5, y: height * 0.52 });
  const orbR = () => Math.max(46, Math.min(width, height) * 0.14);

  const addParticle = (p: Partial<Particle>) => {
    if (particles.length > 540) {
      particles.shift();
    }
    const full: Particle = {
      x: 0,
      y: 0,
      px: 0,
      py: 0,
      vx: 0,
      vy: 0,
      g: 0,
      drag: 0,
      age: 0,
      maxLife: 1,
      size: 4,
      angle: rand(0, TAU),
      spin: 0,
      kind: "glow",
      color: [255, 255, 255],
      alpha: 1,
      r: 0,
      vr: 0,
      w: 0,
      span: 0,
      ...p,
    };
    full.px = full.x;
    full.py = full.y;
    particles.push(full);
  };

  const addWave = (color: Rgb, opts: Partial<Shockwave> = {}) => {
    const c = center();
    waves.push({
      x: c.x,
      y: c.y,
      r: orbR() * 0.9,
      vr: 320,
      age: 0,
      maxLife: 0.7,
      color,
      width: 2.4,
      ...opts,
    });
  };

  const burst = (
    count: number,
    make: (index: number) => Partial<Particle>,
  ) => {
    for (let i = 0; i < count; i += 1) {
      addParticle(make(i));
    }
  };

  const corePositions = () => {
    const c = center();
    const r = orbR() * 2.15;
    const t = performance.now() / 1000;
    return [0, 1, 2].slice(0, Math.max(visual.cores, 0)).map((i) => {
      const a = (i / 3) * TAU + t * 0.35;
      return { x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r };
    });
  };

  // ------------------------------------------------------------------
  // Reaction recipes
  // ------------------------------------------------------------------
  const radial = (speed: number): { vx: number; vy: number; a: number } => {
    const a = rand(0, TAU);
    return { vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, a };
  };

  const petals = (count: number, x: number, y: number, color: Rgb) => {
    burst(count, () => {
      const { vx, vy } = radial(rand(60, 240));
      return {
        kind: "petal",
        x,
        y,
        vx,
        vy,
        g: 120,
        drag: 1.6,
        age: 0,
        maxLife: rand(0.7, 1.3),
        size: rand(4, 9),
        color,
        spin: rand(-5, 5),
        alpha: 0.95,
      };
    });
  };

  const sparks = (
    count: number,
    x: number,
    y: number,
    color: Rgb,
    speed = 300,
  ) => {
    burst(count, () => {
      const { vx, vy } = radial(rand(speed * 0.35, speed));
      return {
        kind: "spark",
        x,
        y,
        vx,
        vy,
        g: 60,
        drag: 1.6,
        age: 0,
        maxLife: rand(0.45, 0.95),
        size: rand(2.2, 4.4),
        color,
        alpha: 1,
      };
    });
  };

  // Рунный круг — печать наложения стихии.
  const runeRing = (x: number, y: number, color: Rgb, big = false) => {
    addParticle({
      kind: "rune",
      x,
      y,
      r: big ? 12 : 8,
      vr: big ? 340 : 220,
      age: 0,
      maxLife: big ? 0.7 : 0.5,
      size: big ? 1.9 : 1.3,
      color,
      alpha: 0.9,
      w: rand(0.5, 1.4) * (Math.random() < 0.5 ? 1 : -1),
    });
  };

  const chainBolt = (color: Rgb, x1: number, y1: number, x2: number, y2: number) => {
    addParticle({
      kind: "bolt",
      x: x1,
      y: y1,
      angle: Math.atan2(y2 - y1, x2 - x1),
      size: Math.hypot(x2 - x1, y2 - y1) * 0.96,
      age: 0,
      maxLife: 0.24,
      color,
      alpha: 0.95,
    });
  };

  const play = (code: string) => {
    const c = center();
    const R = orbR();
    const el = (name: string): Rgb => elementColor(name);
    const pyro = el("pyro");
    const hydro = el("hydro");
    const electro = el("electro");
    const cryo = el("cryo");
    const dendro = el("dendro");
    const anemo = el("anemo");
    const geo = el("geo");
    const steam: Rgb = [224, 236, 250];
    const white: Rgb = [255, 255, 255];

    if (code === "swirl:hydro+electro") {
      for (const color of [hydro, electro]) {
        burst(24, () => ({
          kind: "spiral",
          r: R * rand(0.9, 1.2),
          vr: rand(140, 220),
          w: rand(2.2, 3.6) * (Math.random() < 0.5 ? 1 : -1),
          x: c.x,
          y: c.y,
          age: 0,
          maxLife: rand(0.7, 1.1),
          size: rand(5, 11),
          color,
          alpha: 0.9,
        }));
      }
      sparks(24, c.x, c.y, anemo, 360);
      addWave(anemo, { vr: 460, maxLife: 0.6 });
      addWave(white, { vr: 620, maxLife: 0.35, width: 1.4 });
      return;
    }
    if (code === "lunar-charged") {
      const cloudX = c.x - R * 2.05;
      const cloudY = c.y - R * 1.55;
      burst(34, () => ({
        kind: "star",
        x: c.x + rand(-R * 0.9, R * 0.9),
        y: c.y + rand(-R * 0.4, R * 0.6),
        vx: rand(-24, 24),
        vy: -rand(240, 460),
        drag: 0.6,
        age: 0,
        maxLife: rand(0.5, 0.9),
        size: rand(3.5, 8),
        color: Math.random() < 0.6 ? electro : hydro,
        alpha: 1,
      }));
      burst(12, () => ({
        kind: "glow",
        x: cloudX + rand(-R * 0.9, R * 0.9),
        y: cloudY + rand(-8, 12),
        vx: rand(-30, 30),
        vy: rand(-16, 6),
        age: 0,
        maxLife: rand(0.7, 1.1),
        size: rand(16, 30),
        color: electro,
        alpha: 0.5,
      }));
      flash(electro, 0.2);
      addWave(electro, { x: cloudX, y: cloudY, r: 8, vr: 340, maxLife: 0.6, width: 1.8 });
      return;
    }
    if (code === "lunar-bloom") {
      petals(30, c.x, c.y, dendro);
      sparks(22, c.x, c.y, hydro, 240);
      burst(6, () => ({
        kind: "pickup",
        x: c.x + rand(-R * 1.6, R * 1.6),
        y: c.y + R * 1.1,
        vy: -rand(40, 90),
        age: 0,
        maxLife: rand(1.1, 1.6),
        size: 8,
        color: dendro,
        alpha: 1,
      }));
      flash(dendro, 0.14);
      addWave(dendro, { vr: 250, maxLife: 0.9 });
      return;
    }
    if (code === "lunar-crystallize") {
      burst(30, () => {
        const { vx, vy } = radial(rand(60, 220));
        return {
          kind: "shard",
          x: c.x,
          y: c.y,
          vx,
          vy,
          drag: 2.2,
          age: 0,
          maxLife: rand(0.5, 0.9),
          size: rand(4, 10),
          color: geo,
          spin: rand(-5, 5),
          alpha: 1,
        };
      });
      sparks(14, c.x, c.y, hydro, 200);
      shake(2.5);
      addWave(geo, { vr: 280, maxLife: 0.8, width: 2 });
      return;
    }
    if (code === "moondrift-harmony") {
      for (let i = 0; i < 3; i += 1) {
        const a = -Math.PI / 2 + (i / 3) * TAU;
        const pos = {
          x: c.x + Math.cos(a) * R * 2.6,
          y: c.y + Math.sin(a) * R * 2.4,
        };
        sparks(10, pos.x, pos.y, geo, 460);
        addWave(geo, { x: pos.x, y: pos.y, r: 10, vr: 420, maxLife: 0.55 });
      }
      shake(3);
      flash(geo, 0.12);
      addWave(geo, { vr: 520, width: 2.6, maxLife: 0.7 });
      return;
    }
    if (code === "stellar-conduct") {
      burst(38, () => {
        const { vx, vy } = radial(rand(110, 360));
        return {
          kind: Math.random() < 0.4 ? "star" : "spark",
          x: c.x,
          y: c.y,
          vx,
          vy,
          drag: 2.1,
          age: 0,
          maxLife: rand(0.5, 1),
          size: rand(3, 8),
          color: Math.random() < 0.6 ? electro : cryo,
          alpha: 1,
        };
      });
      for (let i = 0; i < 3; i += 1) {
        addParticle({
          kind: "slash",
          x: c.x,
          y: c.y,
          r: R * 0.4,
          vr: 700,
          span: 1.1,
          angle: rand(0, TAU),
          age: 0,
          maxLife: 0.3,
          size: 2.4,
          color: cryo,
          alpha: 0.9,
        });
      }
      shake(4);
      flash(cryo, 0.24);
      addWave(cryo, { vr: 200, maxLife: 1, width: 2.6 });
      addWave(electro, { vr: 440, width: 1.6 });
      return;
    }
    if (code === "stellar-swirl" || code === "stellar-swirl:burst") {
      const burstMode = code === "stellar-swirl:burst";
      burst(burstMode ? 70 : 38, () => ({
        kind: "spiral",
        r: R * rand(0.4, 1.1),
        vr: burstMode ? rand(260, 520) : rand(120, 240),
        w: rand(2.6, 4.2) * (Math.random() < 0.5 ? 1 : -1),
        x: c.x,
        y: c.y,
        age: 0,
        maxLife: rand(0.6, 1.1),
        size: rand(4, 10),
        color: Math.random() < 0.55 ? anemo : cryo,
        alpha: 1,
      }));
      sparks(burstMode ? 46 : 18, c.x, c.y, cryo, burstMode ? 520 : 340);
      if (burstMode) {
        burst(26, () => {
          const { vx, vy } = radial(rand(200, 480));
          return {
            kind: "star",
            x: c.x,
            y: c.y,
            vx,
            vy,
            drag: 1.8,
            age: 0,
            maxLife: rand(0.6, 1.1),
            size: rand(4, 10),
            color: white,
            alpha: 1,
          };
        });
        burst(12, () => {
          const { vx, vy } = radial(rand(160, 420));
          return {
            kind: "star",
            x: c.x,
            y: c.y,
            vx,
            vy,
            drag: 1.9,
            age: 0,
            maxLife: rand(0.5, 1),
            size: rand(3, 8),
            color: [255, 236, 180],
            alpha: 0.95,
          };
        });
        shake(9);
        flash(cryo, 0.4);
        addWave(cryo, { vr: 640, width: 3.6, maxLife: 0.8 });
        addWave(white, { vr: 420, maxLife: 0.5, width: 1.6 });
      } else {
        addWave(anemo, { vr: 360, width: 2, maxLife: 0.8 });
      }
      return;
    }
    if (code.startsWith("swirl:")) {
      const color = el(code.slice(6));
      burst(44, () => ({
        kind: "spiral",
        r: R * rand(0.9, 1.2),
        vr: rand(140, 220),
        w: rand(2.2, 3.6) * (Math.random() < 0.5 ? 1 : -1),
        x: c.x,
        y: c.y,
        age: 0,
        maxLife: rand(0.7, 1.1),
        size: rand(5, 11),
        color,
        alpha: 0.9,
      }));
      sparks(18, c.x, c.y, color, 300);
      addWave(anemo, { vr: 420, maxLife: 0.6 });
      return;
    }
    if (code.startsWith("crystallize:")) {
      const color = el(code.slice(12));
      burst(24, () => {
        const { vx, vy, a } = radial(rand(60, 160));
        return {
          kind: "shard",
          x: c.x + Math.cos(a) * R,
          y: c.y + Math.sin(a) * R,
          vx: -vx * 1.6,
          vy: -vy * 1.6,
          drag: 2.4,
          age: 0,
          maxLife: 0.55,
          size: rand(4, 8),
          color: geo,
          spin: rand(-6, 6),
          alpha: 1,
        };
      });
      addParticle({
        kind: "pickup",
        x: c.x + R * 0.7,
        y: c.y - R * 0.4,
        vy: -46,
        age: 0,
        maxLife: 1.4,
        size: 15,
        color,
        alpha: 1,
      });
      sparks(10, c.x, c.y, color, 180);
      addWave(geo, { vr: 260, maxLife: 0.8, width: 1.8 });
      return;
    }

    switch (code) {
      case "vaporize": {
        burst(34, () => {
          const { vx, vy } = radial(rand(20, 70));
          return {
            kind: "steam",
            x: c.x + rand(-R, R) * 0.6,
            y: c.y + rand(-R, R) * 0.5,
            vx,
            vy: vy - rand(26, 60),
            g: -14,
            drag: 0.9,
            age: 0,
            maxLife: rand(1.1, 1.9),
            size: rand(20, 42),
            color: steam,
            alpha: 0.42,
          };
        });
        sparks(18, c.x, c.y, hydro, 260);
        flash(hydro, 0.16);
        addWave(steam, { vr: 360 });
        addWave(white, { vr: 240, maxLife: 0.4, width: 1.2 });
        break;
      }
      case "melt": {
        burst(44, () => {
          const { vx, vy, a } = radial(rand(100, 280));
          return {
            kind: "shard",
            x: c.x + Math.cos(a) * R * 0.5,
            y: c.y + Math.sin(a) * R * 0.5,
            vx,
            vy,
            g: 300,
            drag: 1.1,
            age: 0,
            maxLife: rand(0.6, 1),
            size: rand(4, 10),
            color: Math.random() < 0.55 ? cryo : white,
            spin: rand(-7, 7),
            alpha: 0.95,
          };
        });
        sparks(16, c.x, c.y, pyro, 340);
        shake(3);
        flash(pyro, 0.2);
        addWave(pyro, { vr: 320 });
        break;
      }
      case "overloaded": {
        burst(60, () => {
          const { vx, vy } = radial(rand(160, 520));
          return {
            kind: "spark",
            x: c.x,
            y: c.y,
            vx,
            vy,
            g: 40,
            drag: 1.8,
            age: 0,
            maxLife: rand(0.5, 1),
            size: rand(2.4, 5),
            color: Math.random() < 0.7 ? pyro : electro,
            alpha: 1,
          };
        });
        burst(20, () => {
          const a = rand(-Math.PI, 0);
          return {
            kind: "flame",
            x: c.x + rand(-R * 0.5, R * 0.5),
            y: c.y + rand(-R * 0.3, R * 0.3),
            vx: Math.cos(a) * rand(40, 140),
            vy: -rand(60, 200),
            drag: 1,
            age: 0,
            maxLife: rand(0.5, 1),
            size: rand(5, 13),
            color: Math.random() < 0.6 ? pyro : [255, 176, 92],
            alpha: 1,
          };
        });
        burst(22, () => {
          const { vx, vy } = radial(rand(30, 140));
          return {
            kind: "steam",
            x: c.x + rand(-R, R) * 0.5,
            y: c.y + rand(-R, R) * 0.5,
            vx,
            vy: vy - 20,
            g: -30,
            drag: 1,
            age: 0,
            maxLife: rand(1.1, 1.8),
            size: rand(30, 56),
            color: [134, 128, 148],
            alpha: 0.34,
          };
        });
        shake(8);
        flash(pyro, 0.34);
        addWave(pyro, { vr: 560, width: 5 });
        addWave(white, { vr: 380, maxLife: 0.4, width: 2.4 });
        addWave(electro, { vr: 300, maxLife: 0.55, width: 1.8 });
        break;
      }
      case "electro-charged": {
        for (let i = 0; i < 5; i += 1) {
          const a1 = rand(0, TAU);
          const a2 = a1 + rand(1.2, 2.6);
          chainBolt(
            electro,
            c.x + Math.cos(a1) * R * 1.66,
            c.y + Math.sin(a1) * R * 1.66,
            c.x + Math.cos(a2) * R * 1.66,
            c.y + Math.sin(a2) * R * 1.66,
          );
        }
        sparks(26, c.x, c.y, electro, 340);
        flash(electro, 0.16);
        addWave(electro, { vr: 440 });
        break;
      }
      case "freeze": {
        burst(30, () => {
          const a = rand(0, TAU);
          const speed = rand(120, 220);
          return {
            kind: "shard",
            x: c.x + Math.cos(a) * R * 1.7,
            y: c.y + Math.sin(a) * R * 1.7,
            vx: -Math.cos(a) * speed,
            vy: -Math.sin(a) * speed,
            drag: 3.4,
            age: 0,
            maxLife: 0.5,
            size: rand(4, 9),
            color: cryo,
            angle: a + Math.PI,
            spin: rand(-2, 2),
            alpha: 0.95,
          };
        });
        burst(18, () => ({
          kind: "star",
          x: c.x + rand(-R * 1.4, R * 1.4),
          y: c.y + rand(-R * 1.2, R * 1.2),
          vx: rand(-30, 30),
          vy: rand(10, 40),
          age: 0,
          maxLife: rand(0.9, 1.5),
          size: rand(2.5, 5),
          color: white,
          alpha: 0.9,
        }));
        flash(cryo, 0.2);
        addWave(cryo, { vr: 300, width: 2 });
        break;
      }
      case "superconduct": {
        sparks(44, c.x, c.y, electro, 400);
        sparks(24, c.x, c.y, cryo, 300);
        burst(14, () => {
          const { vx, vy } = radial(rand(10, 40));
          return {
            kind: "steam",
            x: c.x + rand(-R, R) * 0.7,
            y: c.y + rand(-R, R) * 0.7,
            vx,
            vy,
            g: -20,
            age: 0,
            maxLife: rand(1.2, 1.9),
            size: rand(18, 32),
            color: [188, 200, 255],
            alpha: 0.4,
          };
        });
        shake(3);
        addWave(electro, { vr: 420, width: 2.6 });
        break;
      }
      case "burning": {
        burst(34, () => {
          const a = rand(-Math.PI, 0);
          return {
            kind: "flame",
            x: c.x + rand(-R, R) * 0.7,
            y: c.y + rand(-R * 0.2, R * 0.5),
            vx: Math.cos(a) * rand(10, 50),
            vy: -rand(80, 190),
            drag: 0.6,
            age: 0,
            maxLife: rand(0.6, 1.2),
            size: rand(7, 15),
            color: Math.random() < 0.6 ? pyro : [255, 194, 106],
            alpha: 0.95,
          };
        });
        sparks(10, c.x, c.y, pyro, 200);
        addWave(pyro, { vr: 260, maxLife: 0.6, width: 1.8 });
        break;
      }
      case "bloom": {
        petals(28, c.x, c.y, dendro);
        sparks(20, c.x, c.y, Math.random() < 0.5 ? dendro : hydro, 260);
        burst(8, () => ({
          kind: "pickup",
          x: c.x + rand(-R * 1.4, R * 1.4),
          y: c.y + rand(-R * 0.4, R * 0.6),
          vy: -rand(20, 60),
          age: 0,
          maxLife: rand(0.9, 1.4),
          size: 8,
          color: dendro,
          alpha: 1,
        }));
        flash(dendro, 0.12);
        addWave(dendro, { vr: 240, maxLife: 0.9 });
        break;
      }
      case "burgeon": {
        for (const pos of corePositions()) {
          sparks(34, pos.x, pos.y, dendro, 460);
          petals(10, pos.x, pos.y, dendro);
          addWave(dendro, { x: pos.x, y: pos.y, r: 10, vr: 420, maxLife: 0.6 });
        }
        shake(8);
        flash(dendro, 0.34);
        addWave(dendro, { vr: 560, width: 3, maxLife: 0.7 });
        break;
      }
      case "hyperbloom": {
        for (const pos of corePositions()) {
          const dx = c.x - pos.x;
          const dy = c.y - pos.y;
          burst(16, () => ({
            kind: "spark",
            x: pos.x + rand(-6, 6),
            y: pos.y + rand(-6, 6),
            vx: dx * rand(1.6, 3),
            vy: dy * rand(1.6, 3) - rand(30, 90),
            drag: 1.2,
            age: 0,
            maxLife: rand(0.4, 0.8),
            size: rand(2, 4),
            color: Math.random() < 0.7 ? dendro : electro,
            alpha: 1,
          }));
        }
        flash(dendro, 0.14);
        addWave(dendro, { vr: 380 });
        break;
      }
      case "quicken": {
        burst(22, () => ({
          kind: "spiral",
          r: R * rand(0.5, 1),
          vr: rand(120, 260),
          w: rand(2, 3.4) * (Math.random() < 0.5 ? 1 : -1),
          x: c.x,
          y: c.y,
          age: 0,
          maxLife: rand(0.7, 1.2),
          size: rand(4, 9),
          color: Math.random() < 0.5 ? dendro : electro,
          alpha: 0.9,
        }));
        sparks(18, c.x, c.y, electro, 260);
        addWave(dendro, { vr: 330 });
        break;
      }
      case "aggravate":
      case "spread": {
        const color = code === "aggravate" ? electro : dendro;
        for (let i = 0; i < 2; i += 1) {
          addParticle({
            kind: "slash",
            x: c.x,
            y: c.y,
            r: R * 0.5,
            vr: 620,
            span: 1.3,
            angle: rand(0, TAU),
            age: 0,
            maxLife: 0.26,
            size: 2.2,
            color,
            alpha: 0.95,
          });
        }
        sparks(18, c.x, c.y, color, 320);
        addWave(color, { vr: 280, maxLife: 0.55, width: 1.8 });
        break;
      }
      default: {
        burst(18, () => ({
          kind: "glow",
          x: c.x,
          y: c.y,
          vx: rand(-130, 130),
          vy: rand(-130, 130),
          drag: 1.5,
          age: 0,
          maxLife: 0.5,
          size: rand(3, 6),
          color: [150, 158, 178],
          alpha: 0.7,
        }));
      }
    }
  };

  const cast = (element: ReactionElement, x: number, y: number) => {
    const color = elementColor(element);
    runeRing(x, y, color);
    runeRing(x, y, color);
    beams.push({ x, y, age: 0, maxLife: 0.32, color });
    sparks(16, x, y, color, 200);
    pointerPos.element = null;
  };

  const fizzle = () => {
    play("__none__");
  };

  // ------------------------------------------------------------------
  // Frame
  // ------------------------------------------------------------------
  const step = (dt: number, time: number) => {
    const c = center();
    const R = orbR();

    // ambient emitters -------------------------------------------------
    flameTimer -= dt;
    if (visual.burning && flameTimer <= 0) {
      flameTimer = 0.07;
      addParticle({
        kind: "flame",
        x: c.x + rand(-R, R) * 0.75,
        y: c.y + rand(-R * 0.1, R * 0.55),
        vx: rand(-14, 14),
        vy: -rand(50, 130),
        drag: 0.5,
        age: 0,
        maxLife: rand(0.5, 0.9),
        size: rand(6, 12),
        color: Math.random() < 0.7 ? elementColor("pyro") : [255, 214, 130],
        alpha: 0.9,
      });
    }
    emberTimer -= dt;
    if (visual.burning && emberTimer <= 0) {
      emberTimer = rand(0.2, 0.4);
      addParticle({
        kind: "spark",
        x: c.x + rand(-R, R) * 0.8,
        y: c.y + rand(-R * 0.3, R * 0.4),
        vx: rand(-16, 16),
        vy: -rand(60, 140),
        drag: 0.4,
        age: 0,
        maxLife: rand(0.8, 1.4),
        size: rand(1.4, 2.6),
        color: [255, 196, 110],
        alpha: 0.95,
      });
    }
    crackleTimer -= dt;
    if (visual.quicken && crackleTimer <= 0) {
      crackleTimer = rand(0.3, 0.7);
      const a = rand(0, TAU);
      const x1 = c.x + Math.cos(a) * R;
      const y1 = c.y + Math.sin(a) * R;
      const len = rand(28, 62);
      addParticle({
        kind: "shard",
        x: x1,
        y: y1,
        vx: Math.cos(a) * len * 4,
        vy: Math.sin(a) * len * 4,
        drag: 6,
        age: 0,
        maxLife: 0.18,
        size: rand(3, 6),
        color: elementColor("electro"),
        alpha: 0.9,
      });
    }
    // Электро-разряд тикает, пока жива пара аур «Заряжен»
    ecTimer -= dt;
    if (visual.ec && ecTimer <= 0) {
      ecTimer = rand(0.5, 1);
      const a = rand(0, TAU);
      addParticle({
        kind: "spark",
        x: c.x + Math.cos(a) * R * 1.66,
        y: c.y + Math.sin(a) * R * 1.66,
        vx: Math.cos(a + Math.PI / 2) * rand(80, 180),
        vy: Math.sin(a + Math.PI / 2) * rand(80, 180),
        drag: 2,
        age: 0,
        maxLife: 0.45,
        size: rand(2, 4),
        color: elementColor("electro"),
        alpha: 0.95,
      });
      if (Math.random() < 0.5) {
        const a1 = rand(0, TAU);
        const a2 = a1 + rand(1.4, 2.4);
        chainBolt(
          elementColor("electro"),
          c.x + Math.cos(a1) * R * 1.66,
          c.y + Math.sin(a1) * R * 1.66,
          c.x + Math.cos(a2) * R * 1.66,
          c.y + Math.sin(a2) * R * 1.66,
        );
      }
    }
    // Грозовая туча «Лунного заряда» роняет молнии на сгусток
    boltTimer -= dt;
    if (visual.cloud && boltTimer <= 0) {
      boltTimer = rand(0.6, 1.1);
      const bx = c.x - R * 2.05 + rand(-R * 0.4, R * 0.4);
      const by = c.y - R * 1.4;
      addParticle({
        kind: "bolt",
        x: bx,
        y: by,
        angle: Math.atan2(c.y - by, c.x - bx),
        age: 0,
        maxLife: 0.3,
        size: Math.hypot(c.x - bx, c.y - by) * 0.92,
        color: elementColor("electro"),
        alpha: 1,
      });
    }
    // Снегопад внутри заморозки
    snowTimer -= dt;
    if (visual.frozen && snowTimer <= 0) {
      snowTimer = 0.12;
      addParticle({
        kind: "glow",
        x: rand(0, width),
        y: rand(-10, height * 0.4),
        vx: rand(-8, 8),
        vy: rand(18, 40),
        age: 0,
        maxLife: rand(1.4, 2.4),
        size: rand(1.4, 3),
        color: [235, 244, 255],
        alpha: 0.7,
      });
    }
    // Звёздный вихрь стягивает вещество к центру
    vortexTimer -= dt;
    if (visual.vortex > 0 && vortexTimer <= 0) {
      vortexTimer = 0.11;
      burst(2, () => ({
        kind: "spiral",
        r: R * rand(1.7, 2.3),
        vr: -rand(200, 320),
        w: rand(3.2, 5) * (Math.random() < 0.5 ? 1 : -1),
        x: c.x,
        y: c.y,
        age: 0,
        maxLife: 0.9,
        size: rand(3, 7),
        color: Math.random() < 0.5 ? elementColor("cryo") : elementColor("anemo"),
        alpha: 0.9,
      }));
    }

    // shake ------------------------------------------------------------
    shakeMag *= Math.exp(-dt * 5.5);
    if (shakeMag < 0.05) {
      shakeMag = 0;
    }
    const sx = shakeMag > 0 ? rand(-1, 1) * shakeMag : 0;
    const sy = shakeMag > 0 ? rand(-1, 1) * shakeMag : 0;

    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(sx, sy);

    // background -------------------------------------------------------
    if (bg.width > 1) {
      ctx.drawImage(bg, 0, 0, width, height);
    }
    for (let i = 0; i < 12; i += 1) {
      const a = Math.sin(time * (0.8 + (i % 5) * 0.35) + i * 2.4 + twinkleSeed);
      const alpha = 0.18 + Math.max(0, a) * 0.5;
      const x = ((i * 197.3 + twinkleSeed * 53) % 1) * width;
      const y = ((i * 89.7 + twinkleSeed * 29) % 1) * height;
      drawGlow(ctx, glowSprite([220, 230, 255]), x, y, 7 + (i % 3) * 3, alpha);
    }

    // astrolabe rings ----------------------------------------------------
    const ringR = [R * 1.55, R * 2.15, R * 2.95];
    ctx.save();
    for (let i = 0; i < ringR.length; i += 1) {
      const rr = ringR[i]!;
      ctx.beginPath();
      ctx.setLineDash([2, 10]);
      ctx.lineDashOffset = time * (8 + i * 5) * (i === 1 ? -1 : 1);
      ctx.strokeStyle = `rgba(212, 181, 106, ${0.24 - i * 0.055})`;
      ctx.lineWidth = 1;
      ctx.arc(c.x, c.y, rr, 0, TAU);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    for (let i = 0; i < 7; i += 1) {
      const a = (i / 7) * TAU + time * 0.06;
      const px = c.x + Math.cos(a) * ringR[2]!;
      const py = c.y + Math.sin(a) * ringR[2]!;
      drawGlow(ctx, glowSprite([212, 181, 106]), px, py, 12, 0.5);
    }
    ctx.restore();

    // aura ring comets ---------------------------------------------------
    if (visual.aura) {
      const color = elementColor(visual.aura);
      const pulse = 0.8 + Math.sin(time * 2.4) * 0.2;
      ctx.save();
      ctx.strokeStyle = `rgba(${color.join(",")}, ${0.28 * pulse})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(c.x, c.y, R * 1.55, 0, TAU);
      ctx.stroke();
      // хвост кометы — затухающая дуга позади
      const comet = glowSprite(color);
      for (let i = 0; i < 9; i += 1) {
        const a = (i / 9) * TAU - time * 0.8;
        const px = c.x + Math.cos(a) * R * 1.55;
        const py = c.y + Math.sin(a) * R * 1.55;
        ctx.strokeStyle = `rgba(${color.join(",")}, ${0.3 * pulse})`;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(c.x, c.y, R * 1.55, a + 0.08, a + 0.5);
        ctx.stroke();
        drawGlow(ctx, comet, px, py, 22, 0.55 + Math.sin(time * 3 + i) * 0.2);
        ctx.fillStyle = `rgba(${color.join(",")}, 0.95)`;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    // вторая аура «Заряжен»: встречные кометы цвета пары -------------------
    if (visual.ec) {
      const color2 = elementColor(visual.ec);
      const pulse = 0.8 + Math.sin(time * 2.4 + 1.2) * 0.2;
      ctx.save();
      ctx.strokeStyle = `rgba(${color2.join(",")}, ${0.26 * pulse})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(c.x, c.y, R * 1.78, 0, TAU);
      ctx.stroke();
      const comet2 = glowSprite(color2);
      for (let i = 0; i < 7; i += 1) {
        const a = (i / 7) * TAU + time * 1.1;
        const px = c.x + Math.cos(a) * R * 1.78;
        const py = c.y + Math.sin(a) * R * 1.78;
        ctx.strokeStyle = `rgba(${color2.join(",")}, ${0.3 * pulse})`;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(c.x, c.y, R * 1.78, a - 0.08, a - 0.5);
        ctx.stroke();
        drawGlow(ctx, comet2, px, py, 20, 0.5 + Math.sin(time * 3 + i) * 0.2);
      }
      ctx.restore();
    }

    // frozen shell -------------------------------------------------------
    if (visual.frozen) {
      const color = elementColor("cryo");
      const rr = R * 1.18;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(time * 0.15);
      // ледяные пластины
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * TAU;
        const a1 = a + 0.22;
        const a2 = a - 0.22;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * rr * 1.32, Math.sin(a) * rr * 1.32);
        ctx.lineTo(Math.cos(a1) * rr * 0.92, Math.sin(a1) * rr * 0.92);
        ctx.lineTo(Math.cos(a2) * rr * 0.92, Math.sin(a2) * rr * 0.92);
        ctx.closePath();
        ctx.fillStyle = `rgba(${color.join(",")}, 0.22)`;
        ctx.fill();
        ctx.strokeStyle = `rgba(235, 246, 255, 0.65)`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      // каркас
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = `rgba(${color.join(",")}, 0.9)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * TAU;
        const px = Math.cos(a) * rr;
        const py = Math.sin(a) * rr;
        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.closePath();
      ctx.stroke();
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = `rgba(${color.join(",")}, 1)`;
      ctx.fill();
      ctx.restore();
      const frost = glowSprite(color);
      for (let i = 0; i < 5; i += 1) {
        const a = (i / 5) * TAU + time * 0.3;
        drawGlow(
          ctx,
          frost,
          c.x + Math.cos(a) * rr,
          c.y + Math.sin(a) * rr,
          26,
          0.3,
        );
      }
    }

    // quicken crackle tint ring -------------------------------------------
    if (visual.quicken) {
      const color = elementColor("dendro");
      const pulse = 0.5 + Math.sin(time * 6) * 0.25;
      ctx.save();
      ctx.strokeStyle = `rgba(${color.join(",")}, ${0.4 * pulse})`;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(c.x, c.y, R * 1.34, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }

    // the orb -------------------------------------------------------------
    const coreColor: Rgb = visual.aura
      ? elementColor(visual.aura)
      : [168, 158, 220];
    const breath = 1 + Math.sin(time * 1.9) * 0.03;
    const orbR2 = R * breath;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    // корona rays — медленно вращающиеся лучи
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(time * 0.22);
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * TAU;
      const rayA = 0.05 + Math.sin(time * 1.4 + i) * 0.02;
      ctx.save();
      ctx.rotate(a);
      const grad = ctx.createLinearGradient(orbR2 * 0.6, 0, orbR2 * 2.6, 0);
      grad.addColorStop(0, `rgba(${coreColor.join(",")}, ${rayA})`);
      grad.addColorStop(1, `rgba(${coreColor.join(",")}, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(orbR2 * 0.6, -2.5);
      ctx.lineTo(orbR2 * 2.6, -7);
      ctx.lineTo(orbR2 * 2.6, 7);
      ctx.lineTo(orbR2 * 0.6, 2.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    drawGlow(
      ctx,
      glowSprite(coreColor),
      c.x,
      c.y,
      orbR2 * (visual.aura ? 4.8 : 3.6),
      visual.aura ? 0.66 : 0.42,
    );
    const grad = ctx.createRadialGradient(
      c.x,
      c.y - orbR2 * 0.25,
      2,
      c.x,
      c.y,
      orbR2,
    );
    grad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
    grad.addColorStop(0.45, `rgba(${coreColor.join(",")}, 0.55)`);
    grad.addColorStop(1, `rgba(${coreColor.join(",")}, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(c.x, c.y, orbR2, 0, TAU);
    ctx.fill();
    ctx.restore();

    // bloom cores ---------------------------------------------------------
    if (visual.cores > 0) {
      const color = elementColor("dendro");
      const sprite = glowSprite(color);
      for (const pos of corePositions()) {
        const pulse = 1 + Math.sin(time * 4 + pos.x) * 0.18;
        drawGlow(ctx, sprite, pos.x, pos.y, 40 * pulse, 0.85);
        ctx.save();
        ctx.fillStyle = "rgba(214, 244, 168, 0.95)";
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y, 5, 6.5, time + pos.x, 0, TAU);
        ctx.fill();
        ctx.restore();
        // листик-спутник
        const la = time * 2.4 + pos.x;
        ctx.save();
        ctx.translate(pos.x + Math.cos(la) * 13, pos.y + Math.sin(la) * 13);
        ctx.rotate(la);
        ctx.fillStyle = "rgba(172, 220, 124, 0.8)";
        drawLeaf(ctx, 4.5);
        ctx.fill();
        ctx.restore();
      }
    }

    // грозовая туча «Лунного заряда» ---------------------------------------
    if (visual.cloud) {
      const cloudColor = elementColor("electro");
      const cloudGlow = glowSprite(cloudColor);
      const cloudX = c.x - R * 2.05;
      const cloudY = c.y - R * 1.55;
      const breath = 1 + Math.sin(time * 1.4) * 0.04;
      ctx.save();
      for (let i = 0; i < 3; i += 1) {
        const px = cloudX + (i - 1) * R * 0.6;
        const py = cloudY + Math.abs(i - 1) * 4 + Math.sin(time * 1.6 + i * 2.1) * 2.5;
        const rx = R * 0.52 * breath;
        const ry = R * 0.24 * breath;
        const cap = ctx.createLinearGradient(px, py - ry, px, py + ry);
        cap.addColorStop(0, "rgba(64, 58, 128, 0.98)");
        cap.addColorStop(1, "rgba(19, 17, 44, 0.98)");
        ctx.beginPath();
        ctx.ellipse(px, py, rx, ry, 0, 0, TAU);
        ctx.fillStyle = cap;
        ctx.fill();
        ctx.strokeStyle = `rgba(${cloudColor.join(",")}, 0.8)`;
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
      ctx.restore();
      drawGlow(ctx, cloudGlow, cloudX, cloudY + R * 0.28, R * 1.4, 0.45);
      for (let i = 0; i < 5; i += 1) {
        const a = time * 0.8 + i * 1.3;
        const px = cloudX + Math.sin(a) * R * 0.8;
        const py = cloudY + R * 0.14 + Math.sin(time * 3 + i) * 2;
        drawGlow(ctx, cloudGlow, px, py, 8, 0.9);
      }
    }

    // Лунные пелены кружат кристаллами -------------------------------------
    if (visual.veils > 0) {
      const veilColor = elementColor("geo");
      const veilSprite = glowSprite(veilColor);
      const t = time * 0.25;
      for (let i = 0; i < Math.min(visual.veils, 3); i += 1) {
        const a = -Math.PI / 2 + t + (i / 3) * TAU;
        const px = c.x + Math.cos(a) * R * 2.6;
        const py = c.y + Math.sin(a) * R * 2.4;
        drawGlow(ctx, veilSprite, px, py, 32, 0.6);
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(a + Math.PI / 2);
        ctx.fillStyle = `rgba(${veilColor.join(",")}, 0.9)`;
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(5.5, 0);
        ctx.lineTo(0, 8);
        ctx.lineTo(-5.5, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 246, 214, 0.8)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }
    }

    // Зелёная роса — капли на нижней дуге ----------------------------------
    if (visual.dew > 0) {
      const dewColor = elementColor("dendro");
      const dewSprite = glowSprite(dewColor);
      for (let i = 0; i < Math.min(visual.dew, 3); i += 1) {
        const a = Math.PI / 2 + (i - 1) * 0.5;
        const px = c.x + Math.cos(a) * R * 2.35;
        const py = c.y + Math.sin(a) * R * 2.35 + Math.sin(time * 2 + i) * 2.5;
        drawGlow(ctx, dewSprite, px, py, 20, 0.7);
        ctx.save();
        ctx.fillStyle = "rgba(214, 244, 168, 0.95)";
        ctx.beginPath();
        ctx.ellipse(px, py, 3, 4.5, 0, 0, TAU);
        ctx.fill();
        // блики-крестики
        ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
        ctx.lineWidth = 0.8;
        const tw = 0.5 + Math.sin(time * 4 + i * 2) * 0.5;
        ctx.globalAlpha = tw;
        ctx.beginPath();
        ctx.moveTo(px - 6, py);
        ctx.lineTo(px + 6, py);
        ctx.moveTo(px, py - 6);
        ctx.lineTo(px, py + 6);
        ctx.stroke();
        ctx.restore();
      }
    }

    // призма «Предела путеводной звезды» -----------------------------------
    if (visual.prism) {
      const prismColor = elementColor("cryo");
      const px0 = c.x + R * 1.95;
      const py = c.y - R * 1.95;
      const rr = 15 + Math.sin(time * 2.2) * 1.5;
      // лучи призмы
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 2; i += 1) {
        const ba = time * (0.5 + i * 0.3) * (i === 0 ? 1 : -1) + i * Math.PI;
        const beamLen = R * 2.6;
        const bgrad = ctx.createLinearGradient(px0, py, px0 + Math.cos(ba) * beamLen, py + Math.sin(ba) * beamLen);
        bgrad.addColorStop(0, `rgba(${prismColor.join(",")}, 0.16)`);
        bgrad.addColorStop(1, `rgba(${prismColor.join(",")}, 0)`);
        ctx.fillStyle = bgrad;
        ctx.beginPath();
        ctx.moveTo(px0, py);
        ctx.lineTo(
          px0 + Math.cos(ba - 0.09) * beamLen,
          py + Math.sin(ba - 0.09) * beamLen,
        );
        ctx.lineTo(
          px0 + Math.cos(ba + 0.09) * beamLen,
          py + Math.sin(ba + 0.09) * beamLen,
        );
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      drawGlow(ctx, glowSprite(prismColor), px0, py, rr * 3.6, 0.55);
      ctx.save();
      ctx.translate(px0, py);
      ctx.rotate(time * 0.4);
      ctx.strokeStyle = `rgba(${prismColor.join(",")}, 0.85)`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * TAU;
        const px = Math.cos(a) * rr;
        const yy = Math.sin(a) * rr;
        if (i === 0) {
          ctx.moveTo(px, yy);
        } else {
          ctx.lineTo(px, yy);
        }
      }
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = `rgba(${prismColor.join(",")}, 0.14)`;
      ctx.fill();
      ctx.restore();
    }

    // Звёздный вихрь --------------------------------------------------------
    if (visual.vortex > 0) {
      const swirlCryo = elementColor("cryo");
      const swirlAnemo = elementColor("anemo");
      const rr = R * (visual.vortex === 2 ? 2.15 : 1.7);
      const spin = time * 3.2;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let arm = 0; arm < 3; arm += 1) {
        const color = arm % 2 === 0 ? swirlAnemo : swirlCryo;
        const base = spin + (arm / 3) * TAU;
        const SEGMENTS = 22;
        for (let s = 0; s < SEGMENTS; s += 1) {
          const t0 = s / SEGMENTS;
          const t1 = (s + 1) / SEGMENTS;
          const taper = 1 - t0 * 0.74;
          ctx.strokeStyle = `rgba(${color.join(",")}, ${0.52 * taper})`;
          ctx.lineWidth = 2.4 * taper + 0.3;
          ctx.beginPath();
          const a0 = base + t0 * 2.4;
          const a1 = base + t1 * 2.4;
          const r0 = rr * (1 - t0 * 0.84);
          const r1 = rr * (1 - t1 * 0.84);
          ctx.moveTo(c.x + Math.cos(a0) * r0, c.y + Math.sin(a0) * r0);
          ctx.lineTo(c.x + Math.cos(a1) * r1, c.y + Math.sin(a1) * r1);
          ctx.stroke();
        }
      }
      ctx.restore();
      drawGlow(ctx, glowSprite(swirlCryo), c.x, c.y, rr * 1.15, 0.28);
      // ядро вихря
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(-time * 1.4);
      ctx.fillStyle = `rgba(${swirlCryo.join(",")}, 0.9)`;
      drawStar4(ctx, 0, 0, 8, 3.2);
      ctx.fill();
      ctx.restore();
    }

    // курсорная печать выбранной стихии --------------------------------------
    if (pointerPos.element && pointerPos.x >= 0) {
      const pc = elementColor(pointerPos.element);
      const a = time * 0.9;
      ctx.save();
      ctx.strokeStyle = `rgba(${pc.join(",")}, 0.4)`;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.arc(pointerPos.x, pointerPos.y, 16 + Math.sin(time * 3) * 1.5, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      for (let i = 0; i < 3; i += 1) {
        const ta = a + (i / 3) * TAU;
        const px = pointerPos.x + Math.cos(ta) * 24;
        const py = pointerPos.y + Math.sin(ta) * 24;
        drawGlow(ctx, glowSprite(pc), px, py, 9, 0.6);
      }
      drawGlow(ctx, glowSprite(pc), pointerPos.x, pointerPos.y, 26, 0.24);
      ctx.restore();
    }

    // beams: снаряд летит от печати к сгустку ---------------------------------
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = beams.length - 1; i >= 0; i -= 1) {
      const beam = beams[i]!;
      beam.age += dt;
      if (beam.age >= beam.maxLife) {
        beams.splice(i, 1);
        continue;
      }
      const p = beam.age / beam.maxLife;
      const ease = p * p * (3 - 2 * p);
      // контрольная точка дуги
      const mx = (beam.x + c.x) / 2 + (beam.y - c.y) * 0.18;
      const my = (beam.y + c.y) / 2 + (c.x - beam.x) * 0.18;
      const hx = (1 - ease) * (1 - ease) * beam.x + 2 * (1 - ease) * ease * mx + ease * ease * c.x;
      const hy = (1 - ease) * (1 - ease) * beam.y + 2 * (1 - ease) * ease * my + ease * ease * c.y;
      // хвост
      ctx.strokeStyle = `rgba(${beam.color.join(",")}, ${(1 - p) * 0.55})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(beam.x, beam.y);
      ctx.quadraticCurveTo(mx, my, hx, hy);
      ctx.stroke();
      // голова
      drawGlow(ctx, glowSprite(beam.color), hx, hy, 30 * (1 - ease * 0.5), 0.95);
      if (Math.random() < 0.7) {
        addParticle({
          kind: "spark",
          x: hx,
          y: hy,
          vx: rand(-40, 40),
          vy: rand(-40, 40),
          drag: 3,
          age: 0,
          maxLife: 0.3,
          size: rand(1.4, 2.6),
          color: beam.color,
          alpha: 0.9,
        });
      }
    }

    // particles ----------------------------------------------------------------
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      const p = particles[i]!;
      p.age += dt;
      if (p.age >= p.maxLife) {
        particles.splice(i, 1);
        continue;
      }
      const k = Math.min(dt * 60, 3);
      const fade = 1 - p.age / p.maxLife;
      p.px = p.x;
      p.py = p.y;
      if (p.kind === "spiral") {
        p.r += p.vr * dt;
        const a = Math.atan2(p.y - c.y, p.x - c.x) + p.w * dt;
        p.x = c.x + Math.cos(a) * Math.max(2, p.r);
        p.y = c.y + Math.sin(a) * Math.max(2, p.r);
        if (p.r < 4 && p.vr < 0) {
          p.age = p.maxLife;
        }
      } else if (p.kind === "rune" || p.kind === "slash") {
        p.r += p.vr * dt;
      } else {
        p.vy += p.g * dt;
        if (p.drag) {
          const d = Math.max(0, 1 - p.drag * dt);
          p.vx *= d;
          p.vy *= d;
        }
        p.x += p.vx * k;
        p.y += p.vy * k;
      }
      p.angle += p.spin * dt;
      const sprite = glowSprite(p.color);
      switch (p.kind) {
        case "steam":
          drawGlow(ctx, sprite, p.x, p.y, p.size * (1.6 + p.age), p.alpha * fade);
          break;
        case "flame": {
          const flick = 0.85 + Math.sin(p.age * 40 + p.angle * 7) * 0.15;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.globalAlpha = p.alpha * fade;
          ctx.fillStyle = `rgba(${p.color.join(",")}, 0.95)`;
          ctx.beginPath();
          ctx.moveTo(0, -p.size * 1.4 * flick);
          ctx.quadraticCurveTo(p.size * 0.8, 0, 0, p.size);
          ctx.quadraticCurveTo(-p.size * 0.8, 0, 0, -p.size * 1.4 * flick);
          ctx.fill();
          ctx.fillStyle = "rgba(255, 240, 200, 0.75)";
          ctx.beginPath();
          ctx.moveTo(0, -p.size * 0.8 * flick);
          ctx.quadraticCurveTo(p.size * 0.35, 0, 0, p.size * 0.6);
          ctx.quadraticCurveTo(-p.size * 0.35, 0, 0, -p.size * 0.8 * flick);
          ctx.fill();
          ctx.restore();
          drawGlow(ctx, sprite, p.x, p.y, p.size * 2.4, p.alpha * fade * 0.5);
          break;
        }
        case "star": {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle);
          ctx.globalAlpha = p.alpha * fade;
          ctx.fillStyle = `rgba(${p.color.join(",")}, 0.95)`;
          drawStar4(ctx, 0, 0, p.size, p.size * 0.36);
          ctx.fill();
          ctx.restore();
          drawGlow(ctx, sprite, p.x, p.y, p.size * 2.6, p.alpha * fade * 0.4);
          break;
        }
        case "shard": {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle);
          ctx.globalAlpha = p.alpha * fade;
          ctx.fillStyle = `rgba(${p.color.join(",")}, 0.9)`;
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          ctx.lineTo(p.size * 0.38, 0);
          ctx.lineTo(0, p.size);
          ctx.lineTo(-p.size * 0.38, 0);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
          drawGlow(ctx, sprite, p.x, p.y, p.size * 2, p.alpha * fade * 0.25);
          break;
        }
        case "petal": {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.angle);
          ctx.globalAlpha = p.alpha * fade;
          ctx.fillStyle = `rgba(${p.color.join(",")}, 0.85)`;
          drawLeaf(ctx, p.size);
          ctx.fill();
          ctx.restore();
          drawGlow(ctx, sprite, p.x, p.y, p.size * 2.2, p.alpha * fade * 0.35);
          break;
        }
        case "spark": {
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.strokeStyle = `rgba(${p.color.join(",")}, ${p.alpha * fade})`;
          ctx.lineWidth = p.size;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(p.px, p.py);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
          ctx.restore();
          drawGlow(ctx, sprite, p.x, p.y, p.size * 5, p.alpha * fade * 0.5);
          break;
        }
        case "slash": {
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          ctx.strokeStyle = `rgba(${p.color.join(",")}, ${p.alpha * fade})`;
          ctx.lineWidth = p.size * fade + 0.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(1, p.r), p.angle - p.span / 2, p.angle + p.span / 2);
          ctx.stroke();
          ctx.restore();
          break;
        }
        case "rune": {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.age * 2.4 * p.w);
          ctx.globalAlpha = p.alpha * fade;
          ctx.strokeStyle = `rgba(${p.color.join(",")}, 0.9)`;
          ctx.lineWidth = p.size;
          ctx.setLineDash([6, 5]);
          ctx.beginPath();
          ctx.arc(0, 0, Math.max(2, p.r), 0, TAU);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.arc(0, 0, Math.max(1, p.r) * 0.62, 0, TAU);
          ctx.stroke();
          for (let t = 0; t < 3; t += 1) {
            const ta = (t / 3) * TAU;
            const tx = Math.cos(ta) * Math.max(2, p.r) * 0.82;
            const ty = Math.sin(ta) * Math.max(2, p.r) * 0.82;
            ctx.save();
            ctx.translate(tx, ty);
            ctx.rotate(ta);
            ctx.beginPath();
            ctx.moveTo(0, -4);
            ctx.lineTo(3.4, 3);
            ctx.lineTo(-3.4, 3);
            ctx.closePath();
            ctx.stroke();
            ctx.restore();
          }
          ctx.restore();
          drawGlow(ctx, sprite, p.x, p.y, Math.max(2, p.r) * 2.6, p.alpha * fade * 0.35);
          break;
        }
        case "pickup": {
          const rise = 1 - fade;
          ctx.save();
          ctx.translate(p.x, p.y - rise * 14);
          ctx.rotate(p.angle + time);
          ctx.globalAlpha = p.alpha * fade;
          ctx.fillStyle = `rgba(${p.color.join(",")}, 0.92)`;
          drawStar4(ctx, 0, 0, p.size, p.size * 0.5);
          ctx.fill();
          ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.restore();
          drawGlow(ctx, sprite, p.x, p.y - rise * 14, p.size * 3, fade * 0.7);
          break;
        }
        case "bolt": {
          const dx = Math.cos(p.angle);
          const dy = Math.sin(p.angle);
          const nx = -dy;
          const ny = dx;
          ctx.save();
          ctx.globalAlpha = p.alpha * fade;
          const zig: [number, number][] = [[p.x, p.y]];
          const segs = 5;
          for (let s = 1; s <= segs; s += 1) {
            const t = s / segs;
            const w = s === segs ? 0 : rand(-9, 9);
            zig.push([
              p.x + dx * p.size * t + nx * w,
              p.y + dy * p.size * t + ny * w,
            ]);
          }
          const drawPath = () => {
            ctx.beginPath();
            ctx.moveTo(zig[0]![0], zig[0]![1]);
            for (const [zx, zy] of zig.slice(1)) {
              ctx.lineTo(zx, zy);
            }
            ctx.stroke();
          };
          ctx.strokeStyle = `rgba(${p.color.join(",")}, 0.9)`;
          ctx.lineWidth = 3;
          drawPath();
          ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
          ctx.lineWidth = 1.2;
          drawPath();
          // ветви
          for (let b = 0; b < 2; b += 1) {
            const m = zig[2 + b * 1]!;
            const ba = p.angle + rand(-1, 1) * 0.9;
            ctx.strokeStyle = `rgba(${p.color.join(",")}, 0.55)`;
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(m[0], m[1]);
            ctx.lineTo(m[0] + Math.cos(ba) * rand(9, 18), m[1] + Math.sin(ba) * rand(9, 18));
            ctx.stroke();
          }
          ctx.restore();
          drawGlow(
            ctx,
            sprite,
            p.x + dx * p.size,
            p.y + dy * p.size,
            p.size * 0.8,
            p.alpha * fade * 0.6,
          );
          break;
        }
        default:
          drawGlow(ctx, sprite, p.x, p.y, p.size * 2.4, p.alpha * fade);
      }
    }

    // shockwaves ------------------------------------------------------------
    for (let i = waves.length - 1; i >= 0; i -= 1) {
      const w = waves[i]!;
      w.age += dt;
      if (w.age >= w.maxLife) {
        waves.splice(i, 1);
        continue;
      }
      const fade = 1 - w.age / w.maxLife;
      w.r += w.vr * dt;
      ctx.strokeStyle = `rgba(${w.color.join(",")}, ${fade * 0.7})`;
      ctx.lineWidth = w.width * fade + 0.4;
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.r, 0, TAU);
      ctx.stroke();
    }
    ctx.restore(); // lighter
    ctx.restore(); // shake

    // vignette ----------------------------------------------------------------
    const vg = ctx.createRadialGradient(
      width * 0.5,
      height * 0.52,
      Math.min(width, height) * 0.36,
      width * 0.5,
      height * 0.52,
      Math.max(width, height) * 0.72,
    );
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(3,5,12,0.32)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, width, height);

    // bloom: два понижающих прохода --------------------------------------------
    if (bloomACtx && bloomBCtx && bloomA.width > 1) {
      bloomACtx.clearRect(0, 0, bloomA.width, bloomA.height);
      bloomACtx.drawImage(canvas, 0, 0, bloomA.width, bloomA.height);
      bloomBCtx.clearRect(0, 0, bloomB.width, bloomB.height);
      bloomBCtx.drawImage(bloomA, 0, 0, bloomB.width, bloomB.height);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.imageSmoothingEnabled = true;
      ctx.globalAlpha = 0.55;
      ctx.drawImage(bloomA, 0, 0, width, height);
      ctx.globalAlpha = 0.36;
      ctx.drawImage(bloomB, 0, 0, width, height);
      ctx.restore();
    }

    // flash overlay -------------------------------------------------------------
    if (flashAlpha > 0.002) {
      ctx.fillStyle = `rgba(${flashColor.join(",")}, ${flashAlpha})`;
      ctx.fillRect(0, 0, width, height);
      flashAlpha = Math.max(0, flashAlpha - dt * 1.05);
    }
  };

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  let frame = 0;
  let last = performance.now();
  let elapsed = 0;

  const loop = (now: number) => {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    elapsed += dt;
    step(dt, elapsed);
    frame = requestAnimationFrame(loop);
  };

  const startLoop = () => {
    if (reduced.matches || frame) {
      if (reduced.matches) {
        flashAlpha = 0;
        shakeMag = 0;
        step(0, elapsed);
      }
      return;
    }
    last = performance.now();
    frame = requestAnimationFrame(loop);
  };
  const stopLoop = () => {
    if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  };

  const onVisibility = () => {
    if (document.hidden) {
      stopLoop();
    } else {
      startLoop();
    }
  };
  const onResize = () => {
    fit();
    startLoop();
  };
  const reducedChange = () => {
    stopLoop();
    startLoop();
  };

  const ro = new ResizeObserver(onResize);
  ro.observe(canvas);
  document.addEventListener("visibilitychange", onVisibility);
  reduced.addEventListener("change", reducedChange);
  startLoop();

  return {
    setVisual: (next) => {
      visual = next;
      if (reduced.matches) {
        flashAlpha = 0;
        shakeMag = 0;
        step(0, elapsed);
      }
    },
    cast,
    pointer: (x, y, element) => {
      pointerPos.x = x;
      pointerPos.y = y;
      pointerPos.element = element;
      if (reduced.matches && element) {
        step(0, elapsed);
      }
    },
    play,
    fizzle,
    refresh: () => {
      fit();
      if (reduced.matches) {
        step(0, elapsed);
      }
    },
    destroy: () => {
      stopLoop();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      reduced.removeEventListener("change", reducedChange);
    },
  };
};
