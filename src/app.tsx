import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { CatalogPage } from "./pages/catalog-page";
import { CharacterPage } from "./pages/character-page";
import { ReactionsPage } from "./pages/reactions-page";

// basename держит роуты рабочими под базой деплоя (GitHub Pages: /genshin-guide/)
export const App = () => (
  <BrowserRouter basename={import.meta.env.BASE_URL}>
    <Routes>
      <Route path="/" element={<CatalogPage />} />
      <Route path="/personazh/:slug" element={<CharacterPage />} />
      <Route path="/reakcii" element={<ReactionsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);
