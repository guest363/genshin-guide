import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { CatalogPage } from "./pages/catalog-page";
import { CharacterPage } from "./pages/character-page";
import { ReactionsPage } from "./pages/reactions-page";

export const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<CatalogPage />} />
      <Route path="/personazh/:slug" element={<CharacterPage />} />
      <Route path="/reakcii" element={<ReactionsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
);
