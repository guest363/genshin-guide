const RAW_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/** Префиксирует абсолютные пути из данных базой деплоя (GitHub Pages и т.п.). */
export const withBase = (url: string): string =>
  url.startsWith("/") ? `${RAW_BASE}${url}` : url;
