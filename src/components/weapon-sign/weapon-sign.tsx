import type { WeaponId } from "../../lib/character";
import { withBase } from "../../lib/with-base";
import styles from "./weapon-sign.module.css";

type WeaponSignProps = {
  weapon: WeaponId;
  label: string;
};

const ICON: Record<WeaponId, string> = {
  sword: withBase("/media/weapons/UI_GachaTypeIcon_Sword.png"),
  claymore: withBase("/media/weapons/UI_GachaTypeIcon_Claymore.png"),
  polearm: withBase("/media/weapons/UI_GachaTypeIcon_Pole.png"),
  bow: withBase("/media/weapons/UI_GachaTypeIcon_Bow.png"),
  catalyst: withBase("/media/weapons/UI_GachaTypeIcon_Catalyst.png"),
};

export const WeaponSign = ({ weapon, label }: WeaponSignProps) => (
  <div className={styles.sign}>
    <div className={styles.medallion} data-weapon={weapon}>
      <span className={styles.ring} />
      <img className={styles.icon} src={ICON[weapon]} alt="" />
    </div>
    <span className={styles.caption}>{label}</span>
  </div>
);
