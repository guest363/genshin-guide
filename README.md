# Архив Тейвата

Русская витрина играбельных персонажей Genshin Impact: сетка с фильтрами, пошаговая карточка, таланты и короткий гайд.

## Данные

Исследования лежат в `research/characters`. Каждый файл — один играбельный персонаж. Витрина читает эти файлы напрямую и не хранит второй набор фактов.

Список и сверка: `research/roster.md`.
Как устроена витрина: `research/vitriny-personazhey.md`.

## Стек

React 19, Vite 8, CSS Modules, Vitest. Имена файлов в kebab-case, функции через `const`, типы через `type`, именованные экспорты.

## Команды

```bash
npm install
npm test
npm run dev
npm run build
npm run preview
```
