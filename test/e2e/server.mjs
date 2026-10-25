import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { join } from 'node:path'

import { metrikaScript } from '../../site/metrika.js'

// Двухстраничный сайт для e2e-проверок кита: sitemap с продовым доменом, место под полосу
// прокрутки (about длиннее окна, главная нет), без подсветки касания, кнопка темы
// на `theme.js` и `theme-peek.js`, ленивая Метрика и 404 на `not-found.js`. Всё как
// у сайтов после сборки.

const root = join(import.meta.dirname, '../..')
const port = Number(process.env.E2E_PORT ?? 4399)
const domain = 'https://example.com'

const page = (title, body, head = '') => `<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />${head}
		<title>${title}</title>
		<link rel="stylesheet" href="/site/theme-peek.css" />
		<link rel="stylesheet" href="/site/base.css" />
		<style>
			:root { color-scheme: light dark; }
			:root[data-theme='light'] { color-scheme: light; }
			:root[data-theme='dark'] { color-scheme: dark; }
			body, .theme-peek { margin: 0; padding: 1rem; color: light-dark(#111, #eee); background: light-dark(#fff, #111); }
			a { color: inherit; }
		</style>
		<script src="/site/theme-boot.js"></script>
		<script>${metrikaScript(12345678)}</script>
	</head>
	<body>
		<header>
			<nav><a href="/">Home</a> <a href="/about/">About</a></nav>
			<button type="button" aria-label="Switch the theme">Theme</button>
		</header>
		<main><h1>${title}</h1>${body}</main>
		<script type="module">
			import { toggleTheme } from '/site/theme.js'
			import { themePeek } from '/site/theme-peek.js'

			const button = document.querySelector('button')

			themePeek(button)
			button.addEventListener('click', () => toggleTheme())
		</script>
	</body>
</html>`

const sitemap = (tag, locs) =>
	`<?xml version="1.0" encoding="UTF-8"?><${tag} xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${locs.join('')}</${tag}>`

// Та же разметка, что рисует not-found.astro: Astro в этом сервере нет.
const missing = page(
	'Not found',
	`<div data-not-found data-sitemap="/sitemap-index.xml">
		<p>Такой страницы нет</p>
		<a href="/">На главную</a>
		<button type="button" data-not-found-back hidden>Назад</button>
		<nav aria-label="Возможно, вы искали" data-not-found-suggest hidden>
			<p>Возможно, вы искали</p>
			<ul data-not-found-list></ul>
		</nav>
	</div>
	<script type="module">
		import { notFound } from '/site/not-found.js'

		notFound(document.querySelector('[data-not-found]'))
	</script>`,
	'\n\t\t<meta name="robots" content="noindex" />',
)

const routes = {
	'/': ['text/html', page('Home', '<p>The home page.</p>')],
	'/about/': ['text/html', page('About', '<p style="min-height: 200vh">The about page.</p>')],
	'/sitemap-index.xml': [
		'application/xml',
		sitemap('sitemapindex', [`<sitemap><loc>${domain}/sitemap-0.xml</loc></sitemap>`]),
	],
	'/sitemap-0.xml': [
		'application/xml',
		sitemap('urlset', [`<url><loc>${domain}/</loc></url>`, `<url><loc>${domain}/about/</loc></url>`]),
	],
}

const types = { '.js': 'text/javascript', '.css': 'text/css' }

createServer((request, response) => {
	const { pathname } = new URL(request.url, 'http://localhost')
	const route = routes[pathname]

	if (route) {
		response.writeHead(200, { 'content-type': route[0] }).end(route[1])

		return
	}

	// Стенд компонентов `ui/`, собранный Vite перед прогоном (`npm run test:e2e`).
	if (pathname.startsWith('/ui/')) {
		const file = pathname === '/ui/' ? 'index.html' : pathname.slice('/ui/'.length)

		try {
			const body = readFileSync(join(root, 'test/ui/dist', file))

			response
				.writeHead(200, { 'content-type': types[file.slice(file.lastIndexOf('.'))] ?? 'text/html' })
				.end(body)

			return
		} catch {
			// Стенд не собран или файла нет, проваливаемся в 404 ниже.
		}
	}

	const type = types[pathname.slice(pathname.lastIndexOf('.'))]

	if (pathname.startsWith('/site/') && type) {
		try {
			response.writeHead(200, { 'content-type': type }).end(readFileSync(join(root, pathname)))

			return
		} catch {
			// Файла нет, проваливаемся в 404 ниже.
		}
	}

	response.writeHead(404, { 'content-type': 'text/html' }).end(missing)
}).listen(port)
