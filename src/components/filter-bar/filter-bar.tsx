import type { CharacterFilters } from "../../lib/character";
import { cn } from "../../lib/cn";
import {
  ELEMENT_FILTERS,
  RARITY_FILTERS,
  REGION_FILTERS,
  WEAPON_FILTERS,
} from "../../lib/labels";
import styles from "./filter-bar.module.css";

type FilterBarProps = {
  value: CharacterFilters;
  onChange: (next: CharacterFilters) => void;
};

const isActive = (current: string | number | undefined, id: string | number) =>
  (current ?? "all") === id;

export const FilterBar = ({ value, onChange }: FilterBarProps) => {
  const patch = (partial: CharacterFilters) => {
    onChange({ ...value, ...partial });
  };

  return (
    <section className={styles.filters} aria-label="Фильтры архива">
      <label className={styles.group}>
        <span className={styles.label}>Поиск</span>
        <input
          className={styles.search}
          value={value.query ?? ""}
          onChange={(event) => patch({ query: event.target.value })}
          placeholder="Имя персонажа"
          type="search"
        />
      </label>

      <div className={styles.group}>
        <p className={styles.label}>Стихия</p>
        <div className={styles.chips}>
          {ELEMENT_FILTERS.map((item) => (
            <button
              className={cn(
                styles.chip,
                isActive(value.element, item.id) && styles.chipActive,
              )}
              key={item.id}
              type="button"
              onClick={() => patch({ element: item.id })}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.group}>
        <p className={styles.label}>Оружие</p>
        <div className={styles.chips}>
          {WEAPON_FILTERS.map((item) => (
            <button
              className={cn(
                styles.chip,
                isActive(value.weapon, item.id) && styles.chipActive,
              )}
              key={item.id}
              type="button"
              onClick={() => patch({ weapon: item.id })}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.group}>
        <p className={styles.label}>Редкость</p>
        <div className={styles.chips}>
          {RARITY_FILTERS.map((item) => (
            <button
              className={cn(
                styles.chip,
                isActive(value.rarity, item.id) && styles.chipActive,
              )}
              key={String(item.id)}
              type="button"
              onClick={() => patch({ rarity: item.id })}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.group}>
        <p className={styles.label}>Регион</p>
        <div className={styles.chips}>
          {REGION_FILTERS.map((item) => (
            <button
              className={cn(
                styles.chip,
                isActive(value.region, item.id) && styles.chipActive,
              )}
              key={item.id}
              type="button"
              onClick={() => patch({ region: item.id })}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <button
        className={styles.reset}
        type="button"
        onClick={() =>
          onChange({
            element: "all",
            weapon: "all",
            rarity: "all",
            region: "all",
            query: "",
          })
        }
      >
        Сбросить фильтры
      </button>
    </section>
  );
};
