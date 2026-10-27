<p align="center">
	<img src="https://img.shields.io/badge/English-8b5cf6?logo=data:image/svg%2bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCAzMCI+PGNsaXBQYXRoIGlkPSJ0Ij48cGF0aCBkPSJNMzAsMTVoMzB2MTV6djE1aC0zMHpoLTMwdi0xNXp2LTE1aDMweiIvPjwvY2xpcFBhdGg+PHBhdGggZD0iTTAsMHYzMGg2MHYtMzB6IiBmaWxsPSIjMDEyMTY5Ii8+PHBhdGggZD0iTTAsMCA2MCwzME02MCwwIDAsMzAiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSI2Ii8+PHBhdGggZD0iTTAsMCA2MCwzME02MCwwIDAsMzAiIGNsaXAtcGF0aD0idXJsKCN0KSIgc3Ryb2tlPSIjQzgxMDJFIiBzdHJva2Utd2lkdGg9IjQiLz48cGF0aCBkPSJNMzAsMHYzME0wLDE1aDYwIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMTAiLz48cGF0aCBkPSJNMzAsMHYzME0wLDE1aDYwIiBzdHJva2U9IiNDODEwMkUiIHN0cm9rZS13aWR0aD0iNiIvPjwvc3ZnPg==" alt="English">
	<a href="README.ru.md"><img src="https://img.shields.io/badge/%D0%A0%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9-555?logo=data:image/svg%2bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA5IDYiPjxwYXRoIGZpbGw9IiNmZmYiIGQ9Ik0wIDBoOXYzSDB6Ii8+PHBhdGggZmlsbD0iIzAwMzlhNiIgZD0iTTAgMmg5djJIMHoiLz48cGF0aCBmaWxsPSIjZDUyYjFlIiBkPSJNMCA0aDl2MkgweiIvPjwvc3ZnPg==" alt="Русский"></a>
</p>

<p align="center">
	<img src=".github/assets/banner.en.jpg" alt="infra-site-kit: shared CI, configs and site parts" width="100%">
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

<h3 align="center">One place for what every site shares</h3>
<p align="center">Check and deploy actions, linter and Playwright configs, the author credit, the theme peek and Yandex Metrika</p>

Shared CI, linter and e2e configs for the aimuzov sites built from [infra-site-template](https://github.com/aimuzov/infra-site-template). A fix to the checks, the deploy or the code style lands here once instead of in every site.

## What's inside

- [**Actions**](#actions) `check` and `deploy`: the steps of the site workflows, from `npm ci` to the deploy over SSH.
- [**Configs**](#configs) of Prettier, Stylelint (BEM included) and oxlint, with their plugins.
- [**Author credit**](#author-credit): the shared footer line for Astro and Svelte.
- [**Theme**](#theme): the theme switch logic and the script that applies the choice before the first paint.
- [**Browser language**](#browser-language): a script that sends a visitor to the page in their browser language before the first paint.
- [**Theme peek**](#theme-peek): a theme button that shows the other scheme in a circle around itself.
- [**Base styles**](#base-styles): the root defaults, a steady scrollbar gutter and no tap highlight.
- [**UI parts**](#ui-parts): Svelte buttons, cards, fields, alerts and a file dropzone on tokens a site maps to its palette.
- [**Search**](#search) on Pagefind: a header button, a results dialog and keyboard shortcuts.
- [**Collapsible panels**](#collapsible-panels): a button that hides a sidebar and a script that keeps the choice before the first paint.
- [**Yandex Metrika**](#yandex-metrika) that loads after the first interaction and brings its own CSP sources.
- [**Not-found page**](#not-found-page) with the author's face and suggestions from the sitemap.
- [**Reader changelog**](#reader-changelog): the "Что нового" page, its format and the release PR check.
- [**E2E tests**](#e2e-tests): the Playwright preset and the checks every site shares.
- [**Renovate**](#renovate): the update preset of the sites.

## Actions

- [`check`](check/action.yml): `npm ci`, then Prettier, oxlint, stylelint, `astro check` and `svelte-check`, `node --test`, the build and the reader changelog check. Packages from Ubuntu go in `apt-packages`.
- [`deploy`](deploy/action.yml): SSH to the projects server, where the key runs `deploy/site.sh` of infra-server for the site, then waits for `url` to answer, and for `health-url` too when it is set: the static site says nothing about the backend. `ref` is the release tag to deploy, empty deploys the newest `main`. The server address and its `known_hosts` line live here.

They are composite actions, not reusable workflows: the job stays in the site, so the required `check` status keeps its name, and a site adds its own steps before or after.

## Usage

`.github/workflows/check.yml`:

```yaml
jobs:
  check:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: aimuzov/infra-site-kit/check@v4
```

`.github/workflows/deploy.yml`, a deploy by release. The release job is the reusable [`release.yml`](https://github.com/aimuzov/.github/blob/main/.github/workflows/release.yml) of aimuzov/.github, shared with repositories that are not sites:

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

release-please reads `release-please-config.json` (`"release-type": "node"`, `"packages": { ".": {} }`) and `.release-please-manifest.json` with the current version (`{ ".": "1.0.0" }`). The repo needs "Allow GitHub Actions to create and approve pull requests" in its Actions settings.

## Configs

The repo is also an npm package with the Prettier, Stylelint (BEM included) and oxlint configs. Their plugins are dependencies of the package; Prettier, Stylelint and oxlint stay in the site, so their binaries are there.

```bash
npm install -D github:aimuzov/infra-site-kit#v4.0.0
```

- `.prettierrc.json`: `"@aimuzov/infra-site-kit/prettier"`
- `stylelint.config.mjs`: `export default { extends: ['@aimuzov/infra-site-kit/stylelint'] }`, the site's own `overrides` go next to `extends`
- `.oxlintrc.json`: `{ "extends": ["./node_modules/@aimuzov/infra-site-kit/oxlint.json"] }`

The oxlint config wants blank lines before `return` and `throw`, around blocks (`if`, loops, `try`, `switch`), after `const`/`let` groups and around multiline expressions. `oxlint --fix` puts them in; Prettier only keeps them, so the site runs `oxlint --fix` before `prettier --write`.

npm takes the package as a tarball from GitHub, so the build image needs no git.

## Author credit

The credit line every site shares: "2026 © Сделано с любовью [mark] aimuzov" and, when `repo` is given, an "Исходный код" link with the GitHub mark. The mark is a face with a mustache drawn as one evenodd path with no masks or ids, so a page may hold any number of copies.

- `credit.astro` is for static pages: the same markup plus a script that sets the year by the visitor's clock. Without it the build year stays until the next deploy. Astro inlines the script and puts its hash into the CSP with the rest.
- `credit.svelte` is for Svelte apps, where the year is computed in the browser anyway.
- `year.js` is `syncYear()` itself: it fills every `data-year` element, for a site that has its own.

```astro
---
import Credit from '@aimuzov/infra-site-kit/credit.astro'
---

<Credit repo="https://github.com/aimuzov/example" />
```

By default the credit stretches over the container: the author on the left, "Исходный код" on the right. `align="center"` keeps both parts in the middle.

With a mouse only the face peeks out at first, and the line slides up from below on hover or keyboard focus. Touch screens have no hover, so they show the whole line right away.

`copyright={false}` drops the year when the site has its own © line. The font comes from the footer, and the rest is set from outside with variables, each defaulting to the look above:

| Variable                                 | Default             | What it sets                                    |
| ---------------------------------------- | ------------------- | ----------------------------------------------- |
| `--credit-color`                         | `inherit`           | text and icons                                  |
| `--credit-hover`                         | `inherit`           | links on hover                                  |
| `--credit-gap`                           | `0.25em 0.9em`      | between the author part and the source link     |
| `--credit-glitch-a`, `--credit-glitch-b` | red and cyan at 70% | the two copies the icons split into on a glitch |

Links follow the site's own rules for `a`, underline included. `class` lands on the root element, so a site can also place the credit with its own rules.

## Theme

The theme switch logic without markup; the site draws the button and the labels. The choice lives on `<html data-theme="light|dark">` and in localStorage; without the attribute `prefers-color-scheme` leads, so the site CSS sets `color-scheme` by the attribute and `light dark` without it.

A click always flips the visible scheme, just like the [peek](#theme-peek) circle. When the new scheme matches the system one, the choice is forgotten and the site follows the system again.

`theme-boot.astro` in `<head>` applies the choice before the first paint, so the page does not flash the system theme. It is a same-origin file rather than an inline script, so the Astro CSP lets it through by `'self'` without hashes. `key` is the localStorage key, `theme` by default.

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

- `toggleTheme(options)`: a click; flips the scheme and returns the new theme.
- `applyTheme(theme, options)`: set `auto`, `light` or `dark` directly, say from a menu with a button per theme.
- `nextTheme(theme, system)`: the theme a click will give, for the button label before the click.
- `currentTheme()`, `systemScheme()`, `schemeOf(theme, system)`: what is chosen, what the system has and what is visible.
- `watchTheme(callback)`: watches both the system and the attribute, so a second switch on the page hears about the click too. Calls back right away; returns the unsubscribe.

## Browser language

`locale-boot.astro` in `<head>`, before the styles, sends a visitor from a page in the default language to the same page in the browser language. The rule: the `lang` cookie (an explicit choice in `LangSwitch`) always wins, a visitor who reads the default language among their browser languages stays, the rest go to the first site language they read, or to the other one. On the server the shared Caddy does the same by `Accept-Language` (the `locale-redirect` snippet in infra-server), so the script is a fallback for `astro dev`, `preview` and hosting without that Caddy. It renders nothing on a page with a language prefix: a direct link there is followed as is. A same-origin file, like `theme-boot.astro`. A site with its own scheme passes `locales` and `defaultLocale`.

```astro
---
import LocaleBoot from '@aimuzov/infra-site-kit/locale-boot.astro'
---

<head>
	<LocaleBoot />
</head>
```

## Theme peek

A theme button that shows what it switches to. On hover a circle around it opens to a third of the screen, and inside it the page is drawn in the other scheme. A click puts the circle out until the next hover. Touch screens and reduced motion get no circle.

The circle holds a copy of the page painted in the other scheme: `color-scheme` on the copy flips the `light-dark()` colors, and the `light`/`dark` class is for a site that switches its tokens by a class. Such a site declares its light tokens on `:root, .light` as well, or the copy inside a dark page keeps the dark ones. Rules like `.dark .input` would still reach into a light copy, so they take `:not(.dark .light *)`. The current scheme is read from the root `color-scheme`, so it does not matter whether the choice lives in an attribute or a class.

```svelte
<script>
	import '@aimuzov/infra-site-kit/theme-peek.css'
	import { themePeek } from '@aimuzov/infra-site-kit/theme-peek.js'
</script>

<button onclick={cycle} {@attach themePeek}>…</button>
```

The copy takes the place of `<body>`, so the site adds `.theme-peek` to its body rule for the layout and background: `body, .theme-peek { … }`.

By default the circle shows the scheme opposite to the current one. A switch with a button per theme passes its own: `{@attach (node) => themePeek(node, { target: () => 'dark' })}`. When the target matches the current scheme there is nothing to show and the circle stays hidden. A click on any of several buttons side by side puts the circle out for all of them.

## Base styles

`base.css` holds the root defaults every site shares:

- **Scrollbar gutter.** A page that scrolls is narrower than one that does not by the width of the window scrollbar, so on the way between them the header and everything pinned to the right edge jump sideways. The root reserves the gutter on every page (`scrollbar-gutter: stable`); with scrollbars drawn over the content (macOS, phones) it changes nothing. Layers with `position: fixed` are laid out by the window and reach under the gutter, so a site that lines one up with the page measures `document.body`, not `innerWidth`.
- **No tap highlight.** On touch, WebKit fills the tapped link or button with a grey square box that follows neither the shape of the element nor the style of the site. The root turns it off (`-webkit-tap-highlight-color: transparent`); the property inherits, so buttons and links are left with their own feedback on press.

```astro
---
import '@aimuzov/infra-site-kit/base.css'
---
```

The site imports it once, in the base layout. A new shared root rule lands here, so a site picks it up with the kit update alone.

## UI parts

Svelte parts that several sites drew each on their own, now in one place: `button`, `chip-button`, `card`, `badge`, `alert`, `field`, `input`, `skeleton`, `copy-value`, `info-tip` and `dropzone`. Icons are [Lucide](https://lucide.dev) through `@lucide/svelte`, an optional peer the site installs itself.

The parts read only `--ui-*` tokens. `ui/tokens.css` gives them defaults, and the site maps them to its own palette in `global.css`. The prefix is there because sites name the same thing differently: `--muted` is a text colour in one and a background in another.

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

<Card title="Upload">
	<Dropzone accept=".zip,.xml" maxSize={20 * 1024 * 1024} onfile={(file) => upload(file)} />
</Card>
```

The dropzone takes a file by drag and drop, by click and from the keyboard, checks its type against `accept` (dragging skips the dialog filter) and its size against `maxSize`, and says why a file did not fit. Its `pick()` opens the same dialog from a button elsewhere, for "Replace" next to a result. `ui/files.js` holds that check for the site's own use.

The styles are plain CSS nesting with full class names, so the parts need no PostCSS plugins of the site. The props are typed in `*.svelte.d.ts`.

## Search

`ui/search.svelte` is site search on [Pagefind](https://pagefind.app): a magnifier button for the header and a dialog with the results. It opens by the button, Cmd/Ctrl-K and `/`; arrows move through the results, Enter opens one, Esc closes. A page with sections shows up to three of them, each linking right to its heading. It reads the `--ui-*` tokens like the other parts in `ui/`.

The index is built from the finished build, one per language by `<html lang>`, and the browser loads it in chunks only on the first search. The site installs `pagefind` itself and runs it after the build:

```json
"build": "astro build && pagefind --site dist"
```

```astro
---
import Search from '@aimuzov/infra-site-kit/ui/search.svelte'
---

<Search client:load locale="ru" />
```

- Pagefind compiles its index from WebAssembly, so a site with a strict CSP needs `'wasm-unsafe-eval'` in `script-src`: in Astro that is `scriptDirective: { resources: ["'self'", "'wasm-unsafe-eval'"] }`.
- `astro dev` has no index, and the dialog says so. Try search in `astro build && pagefind --site dist && astro preview`.
- The site marks what to index: `data-pagefind-body` on the main content, `data-pagefind-ignore` on the header and menus. Without marks the whole page goes in.
- `bundle` is the index folder when the site does not live at the root. `limit` is how many pages to show. `shortcut={false}` turns the keys off. `trimHtml` drops `.html` from result links, for a host that serves `/page` from `page.html`; `index.html` is always dropped.

## Collapsible panels

Page sidebars (a section tree, a table of contents, a comments panel) get a button that hides them, and the choice stays on the device. The kit keeps the state and the button; the site folds its own layout, since for one site a panel is a grid column and for another a `position: fixed` block.

A hidden panel is marked on the root with `data-panel-<name>="hidden"`, its localStorage key is `<prefix>:panel-<name>`. `PanelsBoot` in `<head>` sets the attributes before the first paint, like `ThemeBoot`, so panels do not flash on load. It is a same-origin file the CSP lets through by `'self'`.

```astro
---
import PanelsBoot from '@aimuzov/infra-site-kit/panels-boot.astro'
import PanelToggle from '@aimuzov/infra-site-kit/ui/panel-toggle.svelte'
---

<head>
	<PanelsBoot panels={['toc']} prefix="site" />
</head>

<aside>
	<PanelToggle client:load panel="toc" controls="toc" name="the contents" locale="en" prefix="site" />
	<nav id="toc">…</nav>
</aside>
```

```css
:root[data-panel-toc='hidden'] #toc {
	display: none;
}
```

- The button has `aria-expanded`, `aria-controls` and a "Hide …" / "Show …" label built from `name`. `side` picks the icon: `left` or `right`.
- The site sets the folding animation and turns it off for `prefers-reduced-motion`. It keeps the hidden-panel rules inside its breakpoints, so narrow screens where panels are hidden anyway stay intact.
- `togglePanel`, `setPanelHidden`, `isPanelHidden` and `watchPanel` from `panels.js` are there for a button or key of the site's own.
- `expectPanelToggle(page, button, { path })` from the kit checks: the button hides the panel, the choice survives a reload, a second click brings it back.

## Yandex Metrika

The counter loads `tag.js` on the first interaction or 4 s after `load`, so the ~85 KB script doesn't steal bandwidth from fonts and the first photo; earlier `ym` calls wait in a queue. Webvisor is off: on mobile it raises LCP.

- `metrika.astro` goes into `<head>`. It renders the snippet inline and puts its hash, `mc.yandex.ru` and `yastatic.net` into the page CSP through `Astro.csp`, merged with the site's directives. From `<body>` it would be too late: Astro writes the CSP `<meta>` right after the head content. `init` overrides the init options, e.g. `{ webvisor: true }`.
- `metrika-pixel.astro` is the `<noscript>` pixel for visitors without JavaScript. It goes into `<body>`, since an image isn't allowed in `<noscript>` inside `<head>`.

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

The site's `security.csp` keeps no Yandex sources: the component brings them only to pages that have it.

## Not-found page

The 404 every site shares: a big "4 [face] 4" with the author's face in place of the zero (it wiggles its mustache, like in the credit), a heading, a line of text, "На главную" and "Назад", and "Возможно, вы искали" with the pages closest to the missing address.

- The suggestions come from the sitemap: a typo in the address (`/extra` → `/extras`, case, the trailing slash and `.html` don't count) or the nearest parent page (`/blog/post/old` → `/blog/post/`). Until they load, or when nothing fits, the block stays hidden.
- "Назад" shows only when the visitor came from the same site, otherwise it would take them away from it.
- The site keeps its own wrapper: `Base` with `index={false}`, the header, the footer and the height of `<main>`.

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

- Props: `title`, `text`, `home={{ href, label }}`, `back` (`false` drops the button), `suggest` (`false` drops the suggestions and the sitemap request), `sitemap` (the index path, `/sitemap-index.xml` by default), `scope` and `exclude` (path prefixes: a bilingual site gives each language its own 404, `scope="/ru/"` on the Russian one and `exclude={['/ru/']}` on the English one, so each suggests only its own pages). The defaults are in Russian.
- The default slot goes under the text (a second language, a contact line); the `actions` slot goes after the buttons, and the `not-found__action` class gives a link the same look.
- The site theme comes through custom properties: `--not-found-accent` (the face, the main button and the links; `currentColor` by default), `--not-found-muted`, `--not-found-radius`, `--not-found-gap`. The font and the background are inherited.
- `not-found.js` is the same logic without markup: `suggestPaths(path, paths)`, `canGoBack()` and `notFound(root)`; `sitemap.js` reads the sitemap in the browser, `mark.js` is the face path.

## Reader changelog

The "Что нового" page: what changed on the site in the reader's words, next to the technical `CHANGELOG.md` of release-please. Each release gets an entry, and the release PR stays red until it does.

- A site opts in with the `changelog` field of its `package.json`: `true` (the file is `src/frontend/data/changelog.json`), a path, or `{ "file", "guide", "icons" }`. `guide` is a Markdown file with the site's audience and voice (`changelog.guide.md` by default), `icons` are the names of the site's own icons next to the lucide-static ones.
- An entry is `{ "version", "date", "title", "icon", "items" }`, newest first; a link inside an item is `[text](/path/)`. A release with nothing the reader would notice gets `{ "version", "hidden": true }`: it ships, the page skips it.
- The `check` action runs `site-changelog verify` after the build: the format, an entry for the version in `package.json` (release-please bumps it in the release PR) and every link leading to a page in `dist`.
- `site-changelog context` prints what an entry is written from: the guide, the `CHANGELOG.md` section, the PR descriptions (via `gh`), the diff since the last tag, the pages of the build and the recent entries. `site-changelog add entry.json` puts the entry on top, verifies the file and formats it with the site's Prettier.
- An app keeps its changelog in its own repo, and its landing page reads the file at build. The settings go into `changelog.config.json` in place of `package.json`, which a Swift app has none of, and the version comes from `.release-please-manifest.json`. The app's CI runs `npx -y --package=github:aimuzov/infra-site-kit site-changelog verify` on the release PR. The app has no build, so its site paths wait for the site, and a link outside the site must be `https`.
- For two languages set `"locales": ["ru", "en"]`. Each entry then writes `title` and `items` per language, `{ "ru": ..., "en": ... }`, `verify` wants all of them, and the page shows its own locale, falling back to Russian.

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

- Props: `releases`, `icons` (SVG by icon name), `title` (`false` when the site draws its own `<h1>`), `lead`, `toc` (the table of contents label, `false` drops it), `versionLabel`, `locale`. The `hero` slot goes under the lead.
- The site theme comes through custom properties: `--changelog-accent`, `--changelog-muted`, `--changelog-width`, `--changelog-padding`, `--changelog-sticky-top`.
- `changelog.js` is the same logic without markup, for a site with its own page: `itemHtml`, `releaseDate`, `releaseId`, `visibleReleases`, `releaseErrors`, and `localized`/`localizeRelease` for entries in two languages.

## E2E tests

The Playwright preset and the checks every site shares. Unit tests stay on `node --test`; Playwright is for what needs a real browser: the built pages, the CSP, the theme and the counter.

`@playwright/test` stays in the site, so its binary and the browser are there; `@axe-core/playwright` comes with the kit.

```bash
npm install -D @playwright/test
npx playwright install chromium
```

`playwright.config.ts`:

```ts
export { default } from '@aimuzov/infra-site-kit/playwright'
```

The preset runs `e2e/` in Chromium against the production build: `astro build && astro preview` on port 4399 (`E2E_PORT` moves it), a fresh build every run. A site extends it with `defineConfig(preset, { … })`; a server of its own there, such as the API, is started next to the preview.

`e2e/site.spec.ts`:

```ts
import { siteChecks } from '@aimuzov/infra-site-kit/playwright/checks'

siteChecks({
	theme: { button: (page) => page.getByRole('button', { name: /^Тема:/ }) },
	metrika: true,
})
```

- Every page of `sitemap-index.xml` answers 200 and logs no errors to the console: exceptions, failed requests and CSP violations included. `ignoreConsole` lets known messages through.
- axe checks every sitemap page against WCAG 2.1 AA in both schemes. `a11y: { disableRules, exclude }` narrows it, `a11y: false` turns it off.
- With `theme`: clicking the button changes the root `color-scheme` and the choice survives a reload (`persist: false` when it should not), and hovering it opens the theme peek, which a click puts out (`peek: false` for a button without one).
- Every sitemap page reserves the scrollbar gutter and all of them are equally wide, whether they scroll or not (see [Base styles](#base-styles)). Headless Chromium hides scrollbars, so the check launches its own browser with the classic ones. A site without a sitemap lists its pages in `gutter: { paths }`, and `gutter: false` turns the check off.
- Every sitemap page turns the tap highlight off (see [Base styles](#base-styles)). `tapHighlight: { paths }` and `tapHighlight: false` work as with `gutter`.
- With `metrika`: the page has the counter, but `tag.js` is not requested before the first interaction. Yandex itself is never reached.
- With `notFound`: a missing address answers 404 with `noindex`, a link home and a working "Назад", passes axe in both schemes, and a typo in a sitemap address is suggested (`suggest: false` for a site without suggestions, `exclude` as on the component). `path` and `home` move the probe and the home link.

The same checks are exported one by one (`expectHealthyPage`, `expectAccessible`, `expectStableWidth`, `expectNoTapHighlight`, `expectThemeToggle`, `expectThemePeek`, `expectMetrikaDeferred`, `expectNotFound`, `expectNotFoundSuggests`, `sitemapPaths`) for a site's own tests.

In CI the job of `.github/workflows/check.yml` runs them after the `check` action, with the browser cached by the Playwright version, see [infra-site-template](https://github.com/aimuzov/infra-site-template).

## Renovate

[`default.json`](default.json) is the Renovate preset of the sites. It extends the base preset of [aimuzov/.github](https://github.com/aimuzov/.github/blob/main/default.json), which brings the weekly schedule, the 3-day wait after a release, `fix(deps)` for what ends up in production and non-major updates that merge themselves, and adds the site groups: Astro and Svelte, tooling, Node, and no wait for this kit. A site turns it on with `renovate.json`:

```json
{ "extends": ["github>aimuzov/infra-site-kit"] }
```

## Development

Node comes from `engines` in [`package.json`](package.json). The same checks as in CI ([`check.yml`](.github/workflows/check.yml)):

```bash
npm ci
npm run format:check && npm test
npx playwright install chromium
npm run test:e2e
```

- Unit tests (`node --test`) run the configs against [`test/site`](test/site), which takes them by the package name the way a site does, and cover the credit year, the Metrika snippet, the theme peek math, the theme switch and the boot script.
- The kit has no Astro site, so e2e runs the shared checks against a two-page stand-in from [`test/e2e/server.mjs`](test/e2e/server.mjs): a sitemap with the production domain, a theme button with the peek and the deferred Metrika.

## Versions

Sites pin the actions to the major tag `v4` and the package to an exact tag such as `v4.0.0`. A compatible change gets a `v4.x.y` tag and moves `v4` to it; a breaking one starts `v5`.

```bash
git tag v4.0.1 && git tag -f v4 && git push origin v4.0.1 && git push -f origin v4
```

The version in `package.json` goes up in a `chore: release 4.x.y` commit before the tag. Sites then move the package pin to the new tag.

## License

[MIT](LICENSE)
