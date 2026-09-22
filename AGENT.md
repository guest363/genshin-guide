# AGENT.md — как работать с проектом «Архив Тейвата»

Русская витрина играбельных персонажей Genshin Impact + лаборатория реакций.
Публичный адрес: геншин-гайд.рф (GitHub Pages, HTTPS).

## Команды

```bash
npm install        # зависимости
npm run dev        # dev-сервер Vite
npm test           # vitest run (один раз)
npm run build      # tsc --noEmit && vite build — обязателен перед коммитом
npm run preview    # предпросмотр собранного
```

Деплой автоматический: push в `main` → GitHub Actions → Pages. После правок:
build + тесты → коммит → push, без согласований («исправь и запушь сразу»).

## Стек и конвенции

- React 19, Vite 8, CSS Modules, Vitest, react-router-dom 7. Типы `type`,
  функции через `const`, именованные экспорты, файлы в kebab-case.
- TypeScript strict (`noUnusedLocals`, `verbatimModuleSyntax` — типы
  импортировать через `import type`).
- Комментарии в коде — по-русски, только для неочевидных ограничений.
- Коммиты — одной строкой по-русски, без Conventional Commits.

## Архитектура

- Данные персонажей — **единственный источник правды**: `research/characters/*.md`
  (md с JSON-заголовком, 120 файлов). UI читает их в момент сборки через
  `import.meta.glob(..., { query: "?raw" })` (`src/lib/load-catalog.ts`) и
  парсит `src/lib/parse-character.ts`. Не заводить вторые копии фактов.
- Маршруты (`src/app.tsx`, basename = `import.meta.env.BASE_URL`):
  `/` — каталог, `/personazh/:slug` — карточка, `/reakcii` — лаборатория,
  `/victorina` — викторина.
- Слои CSS: `reset → base → tokens → app-components` (`src/styles/base.css`).
  Токены — в `src/styles/tokens.css`; новые цвета стихий/акценты не
  хардкодить, брать `var(--…)` (см. `research/dizayn-sayta.md`).
- Медиа раздаётся из `public/media/<slug>/…`; абсолютные пути из данных
  прогонять через `withBase()` (GitHub Pages база).
- Яндекс.Метрика: `src/lib/metrika.ts`, SPA-хиты вешаются в `App`.

## Разделы-образцы

- Каталог: `src/pages/catalog-page` + `components/character-card`,
  `filter-bar` (состояние фильтров — в URL).
- Карточка: `src/pages/character-page` + пошаговые разделы, `character-nav`
  (мобильное burger-меню).
- Реакции: `src/pages/reactions-page` + `components/reaction-arena`
  (движок — `src/lib/reactions.ts`, официальные RU-названия).
- Викторина: `src/pages/victorina-page`, банки вопросов — `src/lib/quiz/`,
  прогресс — localStorage (`teyvat-quiz-v1`).

## Исследования и артефакты

- `research/characters/` — дампы персонажей; `research/roster.md` — сверка.
- `research/vitriny-personazhey.md` — как подавать витрину.
- `research/victorina-materialy.md` — проверенные факты для вопросов тестов.
- `research/dizayn-sayta.md` — визуальный язык и правила вёрстки.

## Известные ловушки

- `preserve-3d` на обёртках с ховером ломает hit-test (pointerleave-циклы) —
  обёртки держать плоскими.
- Текст не обрезать «…» — сворачивать; кикер не должен дублировать заголовок.
- Мобильные: липкая шапка компактная, canvas-ауру приглушать
  (`opacity ≤ 0.6`), плавающие плиты не перекрывают контент.
- Порты dev-серверов заняты часто — Vite сам поднимает следующий.
- Пересборка данных персонажей — скрипты `scripts/*.py` (python, playwright
  для скриншотов); после медиа-правок проверять вес `public/media`.

## Проверка визуала

Скриншоты делать через python-playwright (desktop 1280×2000 + iPhone-вьюпорт
390×844) и смотреть глазами: сетка, ховеры, липкая шапка, мобильная версия.
