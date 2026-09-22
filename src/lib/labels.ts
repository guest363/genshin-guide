import type { ElementId, RegionId, WeaponId } from "./character";

export const ELEMENT_FILTERS: { id: ElementId | "all"; label: string }[] = [
  { id: "all", label: "Все стихии" },
  { id: "pyro", label: "Пиро" },
  { id: "hydro", label: "Гидро" },
  { id: "anemo", label: "Анемо" },
  { id: "electro", label: "Электро" },
  { id: "dendro", label: "Дендро" },
  { id: "cryo", label: "Крио" },
  { id: "geo", label: "Гео" },
  { id: "adaptive", label: "Адаптивный" },
];

export const WEAPON_FILTERS: { id: WeaponId | "all"; label: string }[] = [
  { id: "all", label: "Все виды оружия" },
  { id: "sword", label: "Одноручный меч" },
  { id: "claymore", label: "Двуручный меч" },
  { id: "polearm", label: "Древковое" },
  { id: "bow", label: "Стрелковое" },
  { id: "catalyst", label: "Катализатор" },
];

export const RARITY_FILTERS: { id: 4 | 5 | "all"; label: string }[] = [
  { id: "all", label: "Любая редкость" },
  { id: 5, label: "5 звёзд" },
  { id: 4, label: "4 звезды" },
];

export const REGION_FILTERS: { id: RegionId | "all"; label: string }[] = [
  { id: "all", label: "Все регионы" },
  { id: "mondstadt", label: "Мондштадт" },
  { id: "liyue", label: "Ли Юэ" },
  { id: "inazuma", label: "Инадзума" },
  { id: "sumeru", label: "Сумеру" },
  { id: "fontaine", label: "Фонтейн" },
  { id: "natlan", label: "Натлан" },
  { id: "nod-krai", label: "Нод-Край" },
  { id: "snezhnaya", label: "Снежная" },
  { id: "none", label: "Без региона" },
];

export const STATUS_FILTERS: { id: "archon" | "all"; label: string }[] = [
  { id: "all", label: "Все статусы" },
  { id: "archon", label: "Архонты" },
];
