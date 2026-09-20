const METRIKA_ID = 112845556;

declare global {
  interface Window {
    ym?: (id: number, method: string, ...args: unknown[]) => void;
  }
}

let lastSent: string | null = null;

/**
 * Хит за SPA-переход. Стартовый URL пропускается: init в index.html
 * уже отправил хит за него.
 */
export const trackPageview = (path: string): void => {
  if (lastSent === null) {
    lastSent = path;
    return;
  }
  if (path === lastSent) {
    return;
  }
  lastSent = path;
  window.ym?.(METRIKA_ID, "hit", path);
};
