export type ElementId =
  | "anemo"
  | "geo"
  | "electro"
  | "dendro"
  | "hydro"
  | "pyro"
  | "cryo"
  | "adaptive";

export type WeaponId = "sword" | "claymore" | "polearm" | "bow" | "catalyst";

export type RegionId =
  | "mondstadt"
  | "liyue"
  | "inazuma"
  | "sumeru"
  | "fontaine"
  | "natlan"
  | "nod-krai"
  | "snezhnaya"
  | "none";

export type CharacterStep = {
  id: string;
  title: string;
  body: string;
  iconUrl?: string;
  previewGif?: string;
  previewVideo?: string;
  /** Постер — первый кадр previewVideo. */
  previewPoster?: string;
};

export type CharacterVideo = {
  title: string;
  youtubeId: string;
};

export type CharacterImage = {
  id: string;
  alt: string;
  url: string;
};

export type CharacterSource = {
  title: string;
  url: string;
};

export type CharacterRecord = {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  nameEn: string;
  title: string;
  rarity: 4 | 5;
  element: ElementId;
  elementLabel: string;
  weapon: WeaponId;
  weaponLabel: string;
  region: RegionId;
  regionLabel: string;
  role: string;
  birthday: string;
  constellation: string;
  affiliation: string;
  baseStats: Record<string, string>;
  ascensionStat: string;
  images: CharacterImage[];
  storyArt: CharacterImage[];
  profileSteps: CharacterStep[];
  storySteps: CharacterStep[];
  talentSteps: CharacterStep[];
  guideSteps: CharacterStep[];
  videos: CharacterVideo[];
  sources: CharacterSource[];
};

export type CharacterFilters = {
  element?: ElementId | "all";
  weapon?: WeaponId | "all";
  rarity?: 4 | 5 | "all";
  region?: RegionId | "all";
  query?: string;
};
