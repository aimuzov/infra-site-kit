<p align="center">
	<a href="README.md"><img src="https://img.shields.io/badge/English-555?logo=data:image/svg%2bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCAzMCI+PGNsaXBQYXRoIGlkPSJ0Ij48cGF0aCBkPSJNMzAsMTVoMzB2MTV6djE1aC0zMHpoLTMwdi0xNXp2LTE1aDMweiIvPjwvY2xpcFBhdGg+PHBhdGggZD0iTTAsMHYzMGg2MHYtMzB6IiBmaWxsPSIjMDEyMTY5Ii8+PHBhdGggZD0iTTAsMCA2MCwzME02MCwwIDAsMzAiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSI2Ii8+PHBhdGggZD0iTTAsMCA2MCwzME02MCwwIDAsMzAiIGNsaXAtcGF0aD0idXJsKCN0KSIgc3Ryb2tlPSIjQzgxMDJFIiBzdHJva2Utd2lkdGg9IjQiLz48cGF0aCBkPSJNMzAsMHYzME0wLDE1aDYwIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMTAiLz48cGF0aCBkPSJNMzAsMHYzME0wLDE1aDYwIiBzdHJva2U9IiNDODEwMkUiIHN0cm9rZS13aWR0aD0iNiIvPjwvc3ZnPg==" alt="English"></a>
	<img src="https://img.shields.io/badge/%D0%A0%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9-8b5cf6?logo=data:image/svg%2bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA5IDYiPjxwYXRoIGZpbGw9IiNmZmYiIGQ9Ik0wIDBoOXYzSDB6Ii8+PHBhdGggZmlsbD0iIzAwMzlhNiIgZD0iTTAgMmg5djJIMHoiLz48cGF0aCBmaWxsPSIjZDUyYjFlIiBkPSJNMCA0aDl2MkgweiIvPjwvc3ZnPg==" alt="Русский">
</p>

<p align="center">
	<img src=".github/assets/banner.jpg" alt="infra-site-kit: общий CI, конфиги и части сайтов" width="100%">
</p>

<p align="center">
	<a href="https://github.com/aimuzov/infra-site-kit/actions/workflows/check.yml"><img src="https://img.shields.io/github/actions/workflow/status/aimuzov/infra-site-kit/check.yml?branch=main&label=check" alt="Check"></a>
	<a href="https://github.com/aimuzov/infra-site-kit/tags"><img src="https://img.shields.io/github/v/tag/aimuzov/infra-site-kit?sort=semver&label=version" alt="Version"></a>
	<a href="package.json"><img src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Faimuzov%2Finfra-site-kit%2Fmain%2Fpackage.json&query=%24.engines.node&label=node&logo=nodedotjs&logoColor=white&color=5fa04e" alt="Node"></a>
	<a href="https://astro.build"><img src="https://img.shields.io/github/package-json/dependency-version/aimuzov/infra-site-kit/peer/astro?logo=astro&logoColor=white&color=bc52ee" alt="Astro"></a>
	<a href="https://svelte.dev"><img src="https://img.shields.io/github/package-json/dependency-version/aimuzov/infra-site-kit/peer/svelte?logo=svelte&logoColor=white&color=ff3e00" alt="Svelte"></a>
	<a href="https://playwright.dev"><img src="https://img.shields.io/github/package-json/dependency-version/aimuzov/infra-site-kit/peer/@playwright/test?label=playwright&color=2ead33" alt="Playwright"></a>
	<a href="LICENSE"><img src="https://img.shields.io/github/license/aimuzov/infra-site-kit" alt="License"></a>
</p>

<h3 align="center">Одно место для того, что общее у всех сайтов</h3>
<p align="center">Actions проверки, релиза и деплоя, конфиги линтеров и Playwright, строка автора, подсмотр темы и Яндекс Метрика</p>

Общий CI, конфиги линтеров и e2e для сайтов aimuzov, собранных из [infra-site-template](https://github.com/aimuzov/infra-site-template). Правка проверок, деплоя или стиля кода попадает сюда один раз, а не в каждый сайт.

## Что внутри

- [**Actions**](#actions) `check` и `deploy`: шаги workflow сайтов, от `npm ci` до деплоя по SSH.
- [**Конфиги**](#конфиги) Prettier, Stylelint (с BEM) и oxlint вместе с плагинами.
- [**Строка автора**](#строка-автора): общая строка футера для Astro и Svelte.
- [**Тема**](#тема): логика переключателя темы и скрипт, который ставит выбор до отрисовки.
- [**Подсмотреть тему**](#подсмотреть-тему): кнопка темы, которая показывает другую схему в круге вокруг себя.
- [**Базовые стили**](#базовые-стили): умолчания корня — место под полосу прокрутки и без подсветки касания.
- [**UI-компоненты**](#ui-компоненты): кнопки, карточки, поля, плашки и дропзона файла на Svelte, на токенах, которые сайт связывает со своей палитрой.
- [**Поиск**](#поиск) по сайту на Pagefind: кнопка для шапки, окно с результатами и горячие клавиши.
- [**Яндекс Метрика**](#яндекс-метрика), которая грузится после первого взаимодействия и сама добавляет свои источники в CSP.
- [**Страница 404**](#страница-404) с лицом автора и подсказками из sitemap.
- [**Ченжлог для читателя**](#ченжлог-для-читателя): страница «Что нового», её формат и проверка релизного PR.
- [**E2E-тесты**](#e2e-тесты): пресет Playwright и проверки, общие для всех сайтов.
- [**Renovate**](#renovate): пресет обновлений для сайтов.

## Actions

- [`check`](check/action.yml): `npm ci`, затем Prettier, oxlint, stylelint, `astro check` и `svelte-check`, `node --test`, сборка и проверка ченжлога для читателя. Пакеты из Ubuntu передаются в `apt-packages`.
- [`deploy`](deploy/action.yml): SSH на сервер проектов, где ключ запускает `deploy/site.sh` из infra-server для этого сайта, затем ждёт ответа от `url`, а если задан `health-url`, то и от него: статика сайта ничего не говорит о бэкенде. `ref` — тег релиза для выкладки, пустой выкладывает свежий `main`. Адрес сервера и его строка `known_hosts` живут здесь.

Это composite actions, а не reusable workflows: job остаётся в сайте, поэтому обязательный статус `check` не меняет имя, а сайт добавляет свои шаги до или после.

## Подключение

`.github/workflows/check.yml`:

```yaml
jobs:
  check:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: aimuzov/infra-site-kit/check@v4
```

`.github/workflows/deploy.yml`, выкладка по релизу. Job релиза — переиспользуемый [`release.yml`](https://github.com/aimuzov/.github/blob/main/.github/workflows/release.yml) из aimuzov/.github, общий с репозиториями, которые не сайты:

```yaml
jobs:
  release:
    if: github.event_name == 'push'
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      actions: write
    uses: aimuzov/.github/.github/workflows/release.yml@v1

  check:
    needs: release
    if: needs.release.outputs.created == 'true'
    uses: ./.github/workflows/check.yml

  deploy:
    needs: [release, check]
    if: >-
      always() && vars.DEPLOY_ENABLED == 'true' &&
      (github.event_name == 'workflow_dispatch' || needs.check.result == 'success')
    runs-on: ubuntu-latest
    timeout-minutes: 20
    environment:
      name: production
      url: https://example.com
    steps:
      - uses: aimuzov/infra-site-kit/deploy@v4
        with:
          ssh-key: ${{ secrets.DEPLOY_SSH_KEY }}
          url: https://example.com/
          health-url: https://example.com/api/health
          ref: ${{ needs.release.outputs.tag || inputs.tag }}
```

release-please читает `release-please-config.json` (`"release-type": "node"`, `"packages": { ".": {} }`) и `.release-please-manifest.json` с текущей версией (`{ ".": "1.0.0" }`). В настройках Actions репо должна стоять галочка «Allow GitHub Actions to create and approve pull requests».

## Конфиги

Репо ещё и npm-пакет с конфигами Prettier, Stylelint (с BEM) и oxlint. Их плагины — зависимости пакета, а сами Prettier, Stylelint и oxlint остаются в сайте, чтобы их бинарники были там.

```bash
npm install -D github:aimuzov/infra-site-kit#v4.0.0
```

- `.prettierrc.json`: `"@aimuzov/infra-site-kit/prettier"`
- `stylelint.config.mjs`: `export default { extends: ['@aimuzov/infra-site-kit/stylelint'] }`, свои `overrides` сайта — рядом с `extends`
- `.oxlintrc.json`: `{ "extends": ["./node_modules/@aimuzov/infra-site-kit/oxlint.json"] }`

Конфиг oxlint требует пустую строку перед `return` и `throw`, вокруг блоков (`if`, циклы, `try`, `switch`), после групп `const`/`let` и вокруг многострочных выражений. Расставляет их `oxlint --fix`; Prettier их только сохраняет, поэтому сайт запускает `oxlint --fix` перед `prettier --write`.

npm забирает пакет архивом с GitHub, так что git в образе сборки не нужен.

## Строка автора

Общая для всех сайтов подпись: «2026 © Сделано с любовью [знак] aimuzov» и, если передан `repo`, ссылка «Исходный код» со знаком GitHub. Знак — лицо с усами одним путём с evenodd, без масок и id, так что копий на странице может быть сколько угодно.

- `credit.astro` — для статичных страниц: та же разметка плюс скрипт, который ставит год по часам посетителя. Без него год из сборки застывает до следующей выкладки. Astro встраивает скрипт в страницу, а его хеш кладёт в CSP вместе с остальными.
- `credit.svelte` — для Svelte-приложений, где год и так считается в браузере.
- `year.js` — сам `syncYear()`: проставляет год во все элементы с `data-year`, если у сайта есть свои.

```astro
---
import Credit from '@aimuzov/infra-site-kit/credit.astro'
---

<Credit repo="https://github.com/aimuzov/example" />
```

По умолчанию подпись растягивается на ширину контейнера: автор слева, «Исходный код» справа. `align="center"` ставит обе части по центру.

С мышью сначала видно только лицо с усами, а подпись выезжает снизу при наведении или фокусе с клавиатуры. На сенсорных экранах наведения нет, поэтому там подпись видна сразу.

`copyright={false}` убирает год, если у сайта своя строка с ©. Шрифт приходит от футера, остальное задаётся снаружи переменными, по умолчанию подпись выглядит как описано выше:

| Переменная                               | По умолчанию               | Что задаёт                                            |
| ---------------------------------------- | -------------------------- | ----------------------------------------------------- |
| `--credit-color`                         | `inherit`                  | текст и иконки                                        |
| `--credit-hover`                         | `inherit`                  | ссылки при наведении                                  |
| `--credit-gap`                           | `0.25em 0.9em`             | отступ между автором и ссылкой на исходники           |
| `--credit-glitch-a`, `--credit-glitch-b` | красный и бирюзовый на 70% | две копии, на которые расслаиваются иконки при глитче |

Ссылки подчиняются правилам сайта для `a`, подчёркивание тоже. `class` ложится на корневой элемент, поэтому сайт может и разместить подпись своими правилами.

## Тема

Логика переключателя темы без разметки, кнопку и подписи сайт рисует сам. Выбор живёт на `<html data-theme="light|dark">` и в localStorage; без атрибута тему ведёт `prefers-color-scheme`, поэтому CSS сайта задаёт `color-scheme` по атрибуту и `light dark` без него.

Клик всегда переворачивает видимую схему, как и круг [подсмотра](#подсмотреть-тему). Если новая схема совпала с системной, выбор забывается и сайт снова идёт за системой.

`theme-boot.astro` в `<head>` ставит выбор до отрисовки, чтобы страница не мигала системной темой. Это файл с того же origin, а не инлайн-скрипт, поэтому CSP Astro пропускает его по `'self'` без хешей. `key` — ключ в localStorage, по умолчанию `theme`.

```astro
---
import ThemeBoot from '@aimuzov/infra-site-kit/theme-boot.astro'
---

<head>
	<ThemeBoot key="site:theme" />
</head>
```

```svelte
<script>
	import { toggleTheme, watchTheme } from '@aimuzov/infra-site-kit/theme.js'

	let theme = $state('auto')

	$effect(() => watchTheme((next) => (theme = next)))
</script>

<button onclick={() => toggleTheme({ key: 'site:theme' })}>…</button>
```

- `toggleTheme(options)` — клик: переворачивает схему и возвращает новую тему.
- `applyTheme(theme, options)` — поставить `auto`, `light` или `dark` напрямую, например из меню с кнопкой на каждую тему.
- `nextTheme(theme, system)` — какую тему даст клик, для подписи кнопки до клика.
- `currentTheme()`, `systemScheme()`, `schemeOf(theme, system)` — что выбрано, что у системы и что видно.
- `watchTheme(callback)` — следит и за системой, и за атрибутом, так что второй переключатель на странице тоже узнает о клике. Первый вызов сразу; возвращает отписку.

## Подсмотреть тему

Кнопка темы, которая показывает, на что переключит. При наведении вокруг неё раскрывается круг на треть экрана, и внутри него страница уже в другой схеме. Клик гасит круг до следующего наведения. На сенсорных экранах и при просьбе системы уменьшить движение круга нет.

В круге копия страницы, покрашенная в другую схему: `color-scheme` на копии переключает цвета из `light-dark()`, а класс `light`/`dark` — для сайта, который меняет токены классом. Такой сайт объявляет светлые токены и на `:root, .light`, иначе копия внутри тёмной страницы останется с тёмными. Правила вида `.dark .input` дотянулись бы и до светлой копии, поэтому им нужен `:not(.dark .light *)`. Текущая схема берётся из `color-scheme` корня, так что неважно, где сайт хранит выбор — в атрибуте или в классе.

```svelte
<script>
	import '@aimuzov/infra-site-kit/theme-peek.css'
	import { themePeek } from '@aimuzov/infra-site-kit/theme-peek.js'
</script>

<button onclick={cycle} {@attach themePeek}>…</button>
```

Копия встаёт на место `<body>`, поэтому сайт добавляет `.theme-peek` к своему правилу для body ради раскладки и фона: `body, .theme-peek { … }`.

По умолчанию круг показывает схему, противоположную текущей. Переключатель с кнопкой на каждую тему передаёт свою: `{@attach (node) => themePeek(node, { target: () => 'dark' })}`. Если цель совпадает с текущей схемой, показывать нечего и круга нет. Клик по любой из нескольких кнопок рядом гасит круг для всех.

## Базовые стили

В `base.css` — умолчания корня, общие для всех сайтов:

- **Место под полосу прокрутки.** Страница с прокруткой уже страницы без неё на ширину полосы окна, поэтому при переходе между ними шапка и всё, что прижато к правому краю, съезжает вбок. Корень держит место под полосу на каждой странице (`scrollbar-gutter: stable`); при полосах поверх контента (macOS, телефоны) это ничего не меняет. Слои с `position: fixed` раскладываются по окну и заходят под место для полосы, поэтому сайт, который выравнивает такой слой по странице, меряет `document.body`, а не `innerWidth`.
- **Без подсветки касания.** На касание WebKit заливает ссылку или кнопку серым прямоугольником, который не повторяет ни форму элемента, ни стиль сайта. Корень её выключает (`-webkit-tap-highlight-color: transparent`); свойство наследуется, и у кнопок и ссылок остаётся свой отклик на нажатие.

```astro
---
import '@aimuzov/infra-site-kit/base.css'
---
```

Сайт подключает его один раз, в базовом layout. Новое общее правило для корня попадает сюда, и сайт получает его одним обновлением кита.

## UI-компоненты

Компоненты на Svelte, которые несколько сайтов рисовали каждый у себя, теперь в одном месте: `button`, `chip-button`, `card`, `badge`, `alert`, `field`, `input`, `skeleton`, `copy-value`, `info-tip` и `dropzone`. Иконки — [Lucide](https://lucide.dev) через `@lucide/svelte`, опциональный peer, который сайт ставит сам.

Компоненты читают только токены `--ui-*`. `ui/tokens.css` задаёт им умолчания, а сайт связывает их со своей палитрой в `global.css`. Префикс нужен потому, что сайты называют одно и то же по-разному: у одного `--muted` — цвет текста, у другого фон.

```astro
---
import '@aimuzov/infra-site-kit/ui/tokens.css'
import '../styles/global.css' /* :root { --ui-bg: var(--bg); --ui-primary: var(--brand); ... } */
---
```

```svelte
<script>
	import Card from '@aimuzov/infra-site-kit/ui/card.svelte'
	import Dropzone from '@aimuzov/infra-site-kit/ui/dropzone.svelte'
</script>

<Card title="Загрузка">
	<Dropzone accept=".zip,.xml" maxSize={20 * 1024 * 1024} onfile={(file) => upload(file)} />
</Card>
```

Дропзона принимает файл перетаскиванием, кликом и с клавиатуры, сверяет тип с `accept` (перетаскивание фильтр диалога обходит) и размер с `maxSize` и пишет, почему файл не подошёл. Её `pick()` открывает тот же диалог из кнопки в другом месте, например «Заменить» рядом с итогом. Сама проверка лежит в `ui/files.js`, если она нужна сайту отдельно.

Стили — родная вложенность CSS с полными именами классов, поэтому плагины PostCSS сайта компонентам не нужны. Пропсы описаны в `*.svelte.d.ts`.

## Поиск

`ui/search.svelte` — поиск по сайту на [Pagefind](https://pagefind.app): кнопка с лупой для шапки и окно с результатами. Открывается кнопкой, Cmd/Ctrl-K и `/`, по результатам ходят стрелками, Enter открывает, Esc закрывает. У страницы с разделами показываются до трёх разделов со ссылкой прямо на заголовок. Читает токены `--ui-*`, как и остальные компоненты из `ui/`.

Индекс строится по готовой сборке, отдельный на каждый язык по `<html lang>`, и браузер грузит его кусками только при первом поиске. Сайт ставит `pagefind` сам и запускает его после сборки:

```json
"build": "astro build && pagefind --site dist"
```

```astro
---
import Search from '@aimuzov/infra-site-kit/ui/search.svelte'
---

<Search client:load locale="ru" />
```

- Pagefind компилирует индекс из WebAssembly, поэтому сайту со строгой CSP нужен `'wasm-unsafe-eval'` в `script-src`: в Astro это `scriptDirective: { resources: ["'self'", "'wasm-unsafe-eval'"] }`.
- В `astro dev` индекса нет, окно так и пишет. Проверять поиск — в `astro build && pagefind --site dist && astro preview`.
- Что индексировать, сайт размечает сам: `data-pagefind-body` на основном содержимом, `data-pagefind-ignore` на шапке и меню. Без разметки в индекс попадает вся страница.
- `bundle` — путь к папке индекса, если сайт живёт не в корне. `limit` — сколько страниц показывать. `shortcut={false}` выключает горячие клавиши. `trimHtml` срезает `.html` в адресах результатов — для хостинга, который отдаёт `/page` по `page.html`; `index.html` срезается всегда.

## Яндекс Метрика

Счётчик грузит `tag.js` по первому действию или через 4 с после `load`, чтобы скрипт на ~85 КБ не отнимал канал у шрифтов и первого фото; вызовы `ym` до того ждут в очереди. Вебвизор выключен: на мобильном он поднимает LCP.

- `metrika.astro` ставится в `<head>`. Он выводит сниппет инлайном и через `Astro.csp` кладёт в CSP страницы его хеш, `mc.yandex.ru` и `yastatic.net`, сливая их с директивами сайта. Из `<body>` было бы поздно: Astro пишет `<meta>` с CSP сразу после содержимого `<head>`. `init` переопределяет параметры инициализации, например `{ webvisor: true }`.
- `metrika-pixel.astro` — пиксель в `<noscript>` для посетителей без JavaScript. Он ставится в `<body>`, потому что картинка в `<noscript>` внутри `<head>` не разрешена.

```astro
---
import Metrika from '@aimuzov/infra-site-kit/metrika.astro'
import MetrikaPixel from '@aimuzov/infra-site-kit/metrika-pixel.astro'
---

<head>
	<Metrika id={12345678} />
</head>
<body>
	<MetrikaPixel id={12345678} />
</body>
```

В `security.csp` сайта источников Яндекса нет: компонент приносит их только на страницы, где он стоит.

## Страница 404

Общая 404 для всех сайтов: крупное «4 [лицо] 4» с лицом автора вместо нуля (шевелит усами, как в строке автора), заголовок, строка текста, «На главную» и «Назад», а ещё «Возможно, вы искали» со страницами, ближе всего похожими на ненайденный адрес.

- Подсказки берутся из sitemap: опечатка в адресе (`/extra` → `/extras`, регистр, хвостовой слеш и `.html` не в счёт) или ближайшая родительская страница (`/blog/post/old` → `/blog/post/`). Пока они не загрузились или ничего не подошло, блока не видно.
- «Назад» появляется, только если человек пришёл с этого же сайта, иначе кнопка увела бы его с сайта.
- Обёртка остаётся за сайтом: `Base` с `index={false}`, шапка, подвал и высота `<main>`.

```astro
---
import NotFound from '@aimuzov/infra-site-kit/not-found.astro'
import Base from '#frontend/layouts/base.astro'
---

<Base title="Страница не найдена" index={false}>
	<main class="missing">
		<NotFound>
			<a slot="actions" class="not-found__action" href="/#contacts">Контакты</a>
		</NotFound>
	</main>
</Base>
```

- Пропсы: `title`, `text`, `home={{ href, label }}`, `back` (`false` убирает кнопку), `suggest` (`false` убирает подсказки и запрос sitemap), `sitemap` (путь индекса, по умолчанию `/sitemap-index.xml`), `scope` и `exclude` (префиксы путей: у двуязычного сайта своя 404 на каждый язык, `scope="/ru/"` у русской и `exclude={['/ru/']}` у английской, и каждая подсказывает только свои страницы). Тексты по умолчанию русские.
- Слот по умолчанию встаёт под текстом (второй язык, строка про контакты), слот `actions` — после кнопок, и класс `not-found__action` даёт ссылке тот же вид.
- Тема сайта приходит CSS-переменными: `--not-found-accent` (лицо, главная кнопка и ссылки, по умолчанию `currentColor`), `--not-found-muted`, `--not-found-radius`, `--not-found-gap`. Шрифт и фон наследуются.
- `not-found.js` — та же логика без разметки: `suggestPaths(path, paths)`, `canGoBack()` и `notFound(root)`; `sitemap.js` читает sitemap в браузере, `mark.js` — путь лица.

## Ченжлог для читателя

Страница «Что нового»: что изменилось на сайте словами читателя, рядом с техническим `CHANGELOG.md` от release-please. У каждого релиза своя запись, и релизный PR остаётся красным, пока её нет.

- Сайт включает ченжлог полем `changelog` в `package.json`: `true` (файл `src/frontend/data/changelog.json`), путь или `{ "file", "guide", "icons" }`. `guide` -- Markdown с аудиторией и голосом сайта (по умолчанию `changelog.guide.md`), `icons` -- имена своих иконок сайта рядом с lucide-static.
- Запись -- `{ "version", "date", "title", "icon", "items" }`, новые сверху; ссылка внутри пункта -- `[текст](/путь/)`. Релиз, в котором читатель ничего не заметит, получает `{ "version", "hidden": true }`: он выкатывается, страница его пропускает.
- Action `check` после сборки запускает `site-changelog verify`: формат, запись для версии из `package.json` (release-please поднимает её в релизном PR) и что каждая ссылка ведёт на страницу в `dist`.
- `site-changelog context` печатает, из чего пишется запись: правила сайта, секцию `CHANGELOG.md`, описания PR (через `gh`), diff с прошлого тега, страницы сборки и последние записи. `site-changelog add entry.json` ставит запись в начало, проверяет файл и форматирует его Prettier сайта.
- Приложение ведёт ченжлог в своём репо, а его лендинг берёт файл при сборке. Настройка лежит в `changelog.config.json` вместо `package.json`, которого у приложения на Swift нет, а версия берётся из `.release-please-manifest.json`. CI приложения запускает на релизном PR `npx -y --package=github:aimuzov/infra-site-kit site-changelog verify`. Своей сборки у приложения нет, поэтому его пути проверит уже сайт, а ссылка наружу должна быть `https`.
- Для двух языков задайте `"locales": ["ru", "en"]`. Тогда `title` и `items` каждой записи пишутся по языкам, `{ "ru": ..., "en": ... }`, `verify` требует их все, а страница показывает язык своей локали, без него русский.

```astro
---
import Changelog from '@aimuzov/infra-site-kit/changelog.astro'
import * as lucide from 'lucide-static'
import releases from '#frontend/data/changelog.json'
import Base from '#frontend/layouts/base.astro'
---

<Base title="Что нового">
	<main>
		<Changelog {releases} icons={lucide} lead="Что изменилось, простыми словами." />
	</main>
</Base>
```

- Props: `releases`, `icons` (SVG по имени иконки), `title` (`false`, если `<h1>` рисует сайт), `lead`, `toc` (подпись оглавления, `false` убирает его), `versionLabel`, `locale`. Слот `hero` идёт под абзацем.
- Тема сайта приходит CSS-переменными: `--changelog-accent`, `--changelog-muted`, `--changelog-width`, `--changelog-padding`, `--changelog-sticky-top`.
- `changelog.js` -- та же логика без разметки, для сайта со своей страницей: `itemHtml`, `releaseDate`, `releaseId`, `visibleReleases`, `releaseErrors` и `localized`/`localizeRelease` для записей на двух языках.

## E2E-тесты

Пресет Playwright и проверки, общие для всех сайтов. Unit-тесты остаются на `node --test`, Playwright — для того, чему нужен настоящий браузер: собранных страниц, CSP, темы и счётчика.

`@playwright/test` стоит в сайте, там же его бинарник и браузер; `@axe-core/playwright` приходит вместе с kit.

```bash
npm install -D @playwright/test
npx playwright install chromium
```

`playwright.config.ts`:

```ts
export { default } from '@aimuzov/infra-site-kit/playwright'
```

Пресет гоняет `e2e/` в Chromium против продовой сборки: `astro build && astro preview` на порту 4399 (`E2E_PORT` его меняет), каждый прогон собирает заново. Сайт расширяет его через `defineConfig(preset, { … })`; свой сервер там, например API, запускается рядом с preview.

`e2e/site.spec.ts`:

```ts
import { siteChecks } from '@aimuzov/infra-site-kit/playwright/checks'

siteChecks({
	theme: { button: (page) => page.getByRole('button', { name: /^Тема:/ }) },
	metrika: true,
})
```

- Каждая страница из `sitemap-index.xml` отвечает 200 и не пишет ошибок в консоль, включая исключения, упавшие запросы и нарушения CSP. `ignoreConsole` пропускает известные сообщения.
- axe проверяет каждую страницу из sitemap по WCAG 2.1 AA в обеих схемах. `a11y: { disableRules, exclude }` сужает проверку, `a11y: false` выключает.
- С `theme`: клик по кнопке меняет `color-scheme` корня, и выбор переживает перезагрузку (`persist: false`, если не должен), а наведение открывает круг с другой темой, который клик гасит (`peek: false` для кнопки без него).
- Каждая страница из sitemap держит место под полосу прокрутки, и ширина у всех одна, есть прокрутка или нет (см. [Базовые стили](#базовые-стили)). Headless Chromium прячет полосы, поэтому проверка запускает свой браузер с обычными. Сайт без sitemap перечисляет страницы в `gutter: { paths }`, а `gutter: false` выключает проверку.
- Ни одна страница из sitemap не подсвечивает касание (см. [Базовые стили](#базовые-стили)). `tapHighlight: { paths }` и `tapHighlight: false` — как у `gutter`.
- С `metrika`: счётчик на странице есть, но `tag.js` не запрашивается до первого действия. До самого Яндекса запросы не доходят.
- С `notFound`: несуществующий адрес отвечает 404 с `noindex`, ссылкой на главную и рабочей «Назад», проходит axe в обеих схемах, а опечатка в адресе из sitemap попадает в подсказки (`suggest: false` для сайта без подсказок, `exclude` — как у компонента). `path` и `home` меняют проверочный адрес и ссылку на главную.

Те же проверки экспортируются по отдельности (`expectHealthyPage`, `expectAccessible`, `expectStableWidth`, `expectNoTapHighlight`, `expectThemeToggle`, `expectThemePeek`, `expectMetrikaDeferred`, `expectNotFound`, `expectNotFoundSuggests`, `sitemapPaths`) для собственных тестов сайта.

В CI их запускает job из `.github/workflows/check.yml` после action `check`, браузер кэшируется по версии Playwright, см. [infra-site-template](https://github.com/aimuzov/infra-site-template).

## Renovate

[`default.json`](default.json) — пресет Renovate для сайтов. Он наследует базовый пресет из [aimuzov/.github](https://github.com/aimuzov/.github/blob/main/default.json): обновления раз в неделю, 3 дня выдержки после релиза, `fix(deps)` для того, что попадает на прод, и самостоятельный мерж обновлений, кроме мажорных. Сверху добавляет группы сайтов: Astro и Svelte, инструменты, Node, и kit без выдержки. Сайт включает его файлом `renovate.json`:

```json
{ "extends": ["github>aimuzov/infra-site-kit"] }
```

## Разработка

Node берётся из `engines` в [`package.json`](package.json). Те же проверки, что в CI ([`check.yml`](.github/workflows/check.yml)):

```bash
npm ci
npm run format:check && npm test
npx playwright install chromium
npm run test:e2e
```

- Юнит-тесты (`node --test`) гоняют конфиги по [`test/site`](test/site), который берёт их по имени пакета, как это делает сайт, и проверяют год в строке автора, сниппет Метрики, геометрию круга темы, переключение темы и скрипт до отрисовки.
- Astro-сайта в ките нет, поэтому e2e гоняет общие проверки по двухстраничной заглушке из [`test/e2e/server.mjs`](test/e2e/server.mjs): sitemap с продовым доменом, кнопка темы с кругом и отложенная Метрика.

## Версии

Actions сайты берут по мажорному тегу `v4`, пакет — по точному тегу вроде `v4.0.0`. Совместимая правка получает тег `v4.x.y` и переносит на него `v4`, ломающая начинает `v5`.

```bash
git tag v4.0.1 && git tag -f v4 && git push origin v4.0.1 && git push -f origin v4
```

Версия в `package.json` поднимается коммитом `chore: release 4.x.y` до тега. Затем сайты переносят пин пакета на новый тег.

## Лицензия

[MIT](LICENSE)
