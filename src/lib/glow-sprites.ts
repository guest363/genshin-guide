// Shared canvas helpers: pre-rendered radial glow sprites. Canvas
// shadowBlur costs a full blur pass per draw call, a cached sprite is one
// drawImage — keep particle drawing on sprites, never on shadowBlur.

export type Rgb = [number, number, number];

export const WHITE: Rgb = [255, 255, 255];

export const rgba = (color: Rgb, alpha: number): string =>
  `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${Math.max(0, Math.min(1, alpha))})`;

export const shade = (color: Rgb, target: Rgb, amount: number): Rgb => [
  Math.round(color[0] + (target[0] - color[0]) * amount),
  Math.round(color[1] + (target[1] - color[1]) * amount),
  Math.round(color[2] + (target[2] - color[2]) * amount),
];

export const spriteCache = new Map<string, HTMLCanvasElement>();

export const glowSprite = (color: Rgb, key = ""): HTMLCanvasElement => {
  const cacheKey = `glow:${key}${color.join(",")}`;
  const cached = spriteCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const size = 64;
  const sprite = document.createElement("canvas");
  sprite.width = size;
  sprite.height = size;
  const g = sprite.getContext("2d");
  if (g) {
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, rgba(shade(color, WHITE, 0.75), 0.9));
    grad.addColorStop(0.3, rgba(color, 0.55));
    grad.addColorStop(1, rgba(color, 0));
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
  }
  spriteCache.set(cacheKey, sprite);
  return sprite;
};

export const drawGlow = (
  ctx: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement,
  x: number,
  y: number,
  size: number,
  alpha: number,
) => {
  ctx.globalAlpha = alpha;
  ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
  ctx.globalAlpha = 1;
};

// Element stroke colors read once from the CSS custom properties.
export const elementRgb: Record<string, Rgb> = {};

export const elementColor = (element: string): Rgb => {
  const cached = elementRgb[element];
  if (cached) {
    return cached;
  }
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(`--${element}`)
    .trim();
  const value = Number.parseInt(
    (raw.startsWith("#") ? raw.slice(1) : raw) || "ffffff",
    16,
  );
  const rgb: Rgb = Number.isNaN(value)
    ? [255, 255, 255]
    : [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  elementRgb[element] = rgb;
  return rgb;
};
