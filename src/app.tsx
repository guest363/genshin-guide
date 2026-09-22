import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { CatalogPage } from "./pages/catalog-page";
import { CharacterPage } from "./pages/character-page";
import { ReactionsPage } from "./pages/reactions-page";
import { VictorinaPage } from "./pages/victorina-page";
import { trackPageview } from "./lib/metrika";

/** Отправляет хит в Метрику при каждом смене маршрута (SPA). */
const MetrikaHits = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    trackPageview(pathname);
  }, [pathname]);
  return null;
};

// basename держит роуты рабочими под базой деплоя (GitHub Pages: /genshin-guide/)
export const App = () => (
  <BrowserRouter basename={import.meta.env.BASE_URL}>
    <MetrikaHits />
    <Routes>
      <Route path="/" element={<CatalogPage />} />
      <Route path="/personazh/:slug" element={<CharacterPage />} />
      <Route path="/reakcii" element={<ReactionsPage />} />
      <Route path="/victorina" element={<VictorinaPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);
