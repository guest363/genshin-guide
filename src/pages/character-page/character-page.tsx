import { useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";
import { CharacterNav } from "../../components/character-nav";
import { CharacterVideo } from "../../components/character-video";
import { ConstellationBoard } from "../../components/constellation-board";
import { ElementAura } from "../../components/element-aura";
import { GuidePath } from "../../components/guide-path";
import { SourceList } from "../../components/source-list";
import { StoryChapter } from "../../components/story-chapter";
import { TalentCard } from "../../components/talent-card";
import { WeaponSign } from "../../components/weapon-sign";
import { findCharacterBySlug } from "../../lib/filter-characters";
import { loadCatalogCharacters } from "../../lib/load-catalog";
import { storyViewsOf } from "../../lib/story-display";
import { combatTalentsOf, constellationsOf } from "../../lib/talent-display";
import styles from "./character-page.module.css";

const characters = loadCatalogCharacters();

export const CharacterPage = () => {
  const { slug = "" } = useParams();
  const character = findCharacterBySlug(characters, slug);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  if (!character) {
    return <Navigate to="/" replace />;
  }

  const splash = character.images.find((image) => image.id === "splash");
  const combatTalents = combatTalentsOf(character.talentSteps);
  const constellations = constellationsOf(character.talentSteps);
  const lead = character.storySteps[0];
  const weaponGuide = character.guideSteps.find((step) => step.id === "weapon");
  const otherGuide = character.guideSteps.filter((step) => step.id !== "weapon");
  const trailer = character.videos[0];
  const chapters = storyViewsOf(
    character.storySteps,
    character.storyArt,
    character.images,
  );
  const navLinks = [
    { id: "oruzhie", label: "Оружие" },
    { id: "nabor", label: "Навыки" },
    ...(trailer ? [{ id: "video", label: "Видео" }] : []),
    { id: "istoriya", label: "История" },
    { id: "sozvezdie", label: "Созвездие" },
    { id: "gayd", label: "Гайд" },
    { id: "istochniki", label: "Источники" },
  ];

  return (
    <main className={styles.page} data-element={character.element}>
      <ElementAura element={character.element} />
      <div className={styles.top}>
        <CharacterNav name={character.shortName} links={navLinks} />
      </div>

      <section className={styles.banner} aria-label="Портрет">
        {splash ? (
          <img
            className={styles.bannerArt}
            src={splash.url}
            alt={splash.alt}
            width={1600}
            height={900}
          />
        ) : null}
        <div className={styles.bannerShade} />
        <div className={styles.bannerCopy}>
          <p className={styles.kicker}>
            {character.rarity}★ · {character.elementLabel} · {character.weaponLabel}
          </p>
          <h1 className={styles.name}>
            {character.name}
          </h1>
          <p className={styles.epithet}>{character.title}</p>
          {lead ? <p className={styles.lead}>{lead.body}</p> : null}
        </div>
      </section>

      <div className={styles.sheet}>
        <dl className={styles.facts}>
          <div>
            <dt>Роль</dt>
            <dd>{character.role}</dd>
          </div>
          <div>
            <dt>Регион</dt>
            <dd>{character.regionLabel}</dd>
          </div>
          <div>
            <dt>Принадлежность</dt>
            <dd>{character.affiliation}</dd>
          </div>
          <div>
            <dt>Созвездие</dt>
            <dd>{character.constellation}</dd>
          </div>
          <div>
            <dt>День рождения</dt>
            <dd>{character.birthday}</dd>
          </div>
          <div>
            <dt>Возвышение</dt>
            <dd>{character.ascensionStat}</dd>
          </div>
        </dl>

        {weaponGuide ? (
          <section className={styles.weapon} id="oruzhie">
            <WeaponSign weapon={character.weapon} label={character.weaponLabel} />
            <div>
              <p className={styles.blockKicker}>С чем играть</p>
              <h2 className={styles.blockTitle}>Оружие</h2>
              <p className={styles.prose}>{weaponGuide.body}</p>
            </div>
          </section>
        ) : null}

        <section className={styles.block} id="nabor">
          <header className={styles.blockHead}>
            <p className={styles.blockKicker}>{character.elementLabel}</p>
            <h2 className={styles.blockTitle}>Навыки</h2>
          </header>
          <div className={styles.talentList}>
            {combatTalents.map((step) => (
              <TalentCard key={step.id} step={step} />
            ))}
          </div>
        </section>

        {trailer ? (
          <section className={styles.block} id="video">
            <header className={styles.blockHead}>
              <p className={styles.blockKicker}>Официальный ролик</p>
              <h2 className={styles.blockTitle}>Видео</h2>
            </header>
            <CharacterVideo video={trailer} />
          </section>
        ) : null}

        <section className={styles.block} id="istoriya">
          <header className={styles.blockHead}>
            <p className={styles.blockKicker}>Лор</p>
            <h2 className={styles.blockTitle}>История</h2>
          </header>
          <div className={styles.storyList}>
            {chapters.map((chapter) => (
              <StoryChapter
                key={chapter.step.id}
                step={chapter.step}
                art={chapter.art}
                layout={chapter.layout}
                kind={chapter.kind}
                kicker={chapter.kicker}
              />
            ))}
          </div>
        </section>

        {constellations.length > 0 ? (
          <section className={styles.block} id="sozvezdie">
            <header className={styles.blockHead}>
              <p className={styles.blockKicker}>{character.constellation}</p>
              <h2 className={styles.blockTitle}>Созвездие</h2>
            </header>
            <ConstellationBoard
              name={character.constellation}
              steps={constellations}
            />
          </section>
        ) : null}

        <section className={styles.block} id="gayd">
          <header className={styles.blockHead}>
            <p className={styles.blockKicker}>Сборка</p>
            <h2 className={styles.blockTitle}>Гайд</h2>
          </header>
          <GuidePath
            steps={otherGuide}
            portrait={splash}
            weapon={character.weapon}
            weaponLabel={character.weaponLabel}
          />
        </section>

        <section className={styles.block} id="istochniki" aria-label="Источники">
          <header className={styles.blockHead}>
            <p className={styles.blockKicker}>Откуда факты</p>
            <h2 className={styles.blockTitle}>Источники</h2>
          </header>
          <SourceList sources={character.sources} />
        </section>
      </div>
    </main>
  );
};
