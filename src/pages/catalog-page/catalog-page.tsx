import { useSearchParams } from "react-router-dom";
import { ArchiveHeader } from "../../components/archive-header";
import { CharacterCard } from "../../components/character-card";
import { FilterBar } from "../../components/filter-bar";
import type {
  CharacterFilters,
  ElementId,
  RegionId,
  WeaponId,
} from "../../lib/character";
import { filterCharacters } from "../../lib/filter-characters";
import {
  ELEMENT_FILTERS,
  REGION_FILTERS,
  WEAPON_FILTERS,
} from "../../lib/labels";
import { loadCatalogCharacters } from "../../lib/load-catalog";
import styles from "./catalog-page.module.css";

const characters = loadCatalogCharacters();

const readElement = (value: string): ElementId | "all" => {
  for (const item of ELEMENT_FILTERS) {
    if (item.id === value) {
      return item.id;
    }
  }
  return "all";
};

const readWeapon = (value: string): WeaponId | "all" => {
  for (const item of WEAPON_FILTERS) {
    if (item.id === value) {
      return item.id;
    }
  }
  return "all";
};

const readRegion = (value: string): RegionId | "all" => {
  for (const item of REGION_FILTERS) {
    if (item.id === value) {
      return item.id;
    }
  }
  return "all";
};

const readFilters = (params: URLSearchParams): CharacterFilters => {
  const rarityRaw = params.get("rarity") ?? "all";
  const rarity = rarityRaw === "4" ? 4 : rarityRaw === "5" ? 5 : "all";

  return {
    element: readElement(params.get("element") ?? "all"),
    weapon: readWeapon(params.get("weapon") ?? "all"),
    rarity,
    region: readRegion(params.get("region") ?? "all"),
    query: params.get("q") ?? "",
  };
};

const writeFilters = (filters: CharacterFilters): URLSearchParams => {
  const params = new URLSearchParams();
  if (filters.element && filters.element !== "all") {
    params.set("element", filters.element);
  }
  if (filters.weapon && filters.weapon !== "all") {
    params.set("weapon", filters.weapon);
  }
  if (filters.rarity && filters.rarity !== "all") {
    params.set("rarity", String(filters.rarity));
  }
  if (filters.region && filters.region !== "all") {
    params.set("region", filters.region);
  }
  if (filters.query?.trim()) {
    params.set("q", filters.query.trim());
  }
  return params;
};

export const CatalogPage = () => {
  const [params, setParams] = useSearchParams();
  const filters = readFilters(params);
  const visible = filterCharacters(characters, filters);

  return (
    <main className={styles.page}>
      <ArchiveHeader visible={visible.length} total={characters.length} />
      <div className={styles.layout}>
        <FilterBar
          value={filters}
          onChange={(next) => setParams(writeFilters(next), { replace: true })}
        />
        {visible.length === 0 ? (
          <p className={styles.empty}>
            Нет персонажей с таким сочетанием фильтров. Сбросьте фильтры или
            измените поиск.
          </p>
        ) : (
          <div className={styles.grid}>
            {visible.map((character) => (
              <CharacterCard character={character} key={character.slug} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
};
