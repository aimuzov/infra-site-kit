/**
 * Ченжлог на стороне Node: настройка, проверка записей по собранному сайту, контекст для того,
 * кто пишет запись релиза, и вставка этой записи. Ведёт его сайт или приложение, чей лендинг
 * показывает его историю.
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'

import { itemLinks, releaseErrors, releaseItems, visibleReleases } from '../site/changelog.js'

const DEFAULT_FILE = 'src/frontend/data/changelog.json'
const DEFAULT_GUIDE = 'changelog.guide.md'
/** Настройка для репозитория без package.json, например приложения на Swift. */
export const CONFIG_FILE = 'changelog.config.json'
const MANIFEST = '.release-please-manifest.json'

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))
const readJsonIf = (path) => (existsSync(path) ? readJson(path) : undefined)

/**
 * Настройка ченжлога из поля `changelog` в package.json или из `changelog.config.json`: `true`,
 * путь к файлу или `{ file, guide, icons, locales }`. Версия -- из package.json, без неё -- из
 * манифеста release-please. Без настройки ченжлог не ведут, и возвращается `null`.
 *
 * @param {string} cwd
 * @returns {{ file: string, guide: string, icons: string[], locales: string[], version: string } | null}
 */
export function readConfig(cwd) {
	const pkg = readJsonIf(join(cwd, 'package.json')) ?? {}
	const raw = pkg.changelog ?? readJsonIf(join(cwd, CONFIG_FILE))

	if (!raw) return null

	const options = typeof raw === 'string' ? { file: raw } : raw === true ? {} : raw

	return {
		file: options.file ?? DEFAULT_FILE,
		guide: options.guide ?? DEFAULT_GUIDE,
		icons: options.icons ?? [],
		locales: options.locales ?? [],
		version: pkg.version ?? readJsonIf(join(cwd, MANIFEST))?.['.'],
	}
}

/**
 * Допустимые имена иконок: экспорты lucide-static сайта и его свои (`icons` в настройке).
 * Без lucide-static у сайта имена не проверяются.
 */
export function iconNames(cwd, custom = []) {
	try {
		const lucide = createRequire(join(cwd, 'package.json'))('lucide-static')

		return [...Object.keys(lucide).filter((name) => /^[A-Z]/.test(name)), ...custom]
	} catch {
		return undefined
	}
}

/**
 * Есть ли в сборке страница по ссылке из пункта: `/a/b/` -- это `dist/a/b/index.html`,
 * `/a/b` -- ещё и `dist/a/b.html`. Якорь и query не важны.
 */
export function distHas(dist, href) {
	const path = decodeURI(href.replace(/[?#].*$/, ''))
	const candidates = [join(dist, path, 'index.html'), join(dist, `${path.replace(/\/$/, '')}.html`), join(dist, path)]

	return candidates.some((file) => existsSync(file) && statSync(file).isFile())
}

/**
 * Ошибки ченжлога сайта: формат записей, запись для текущей версии из package.json
 * (release-please поднимает её в релизном PR) и ссылки на страницы, которых нет в сборке.
 *
 * @param {string} cwd
 * @param {{ dist?: string }} [options] Каталог сборки; если его нет, ссылки не проверяются.
 * @returns {string[]}
 */
export function verifyChangelog(cwd, { dist = 'dist' } = {}) {
	const config = readConfig(cwd)

	if (!config) return []

	const path = join(cwd, config.file)

	if (!existsSync(path)) return [`${config.file} is missing`]

	const releases = readJson(path)
	const errors = releaseErrors(releases, { icons: iconNames(cwd, config.icons), locales: config.locales })

	if (!Array.isArray(releases)) return errors

	if (!releases.some((r) => r?.version === config.version))
		errors.push(`add a ${config.version} entry to ${config.file}, write it from site-changelog context`)

	// Ссылка наружу -- только https; путь сайта проверяется по сборке, если она есть. У
	// приложения сборки нет, и его пути проверит сайт, когда соберёт историю.
	const built = join(cwd, dist)

	for (const r of visibleReleases(releases)) {
		for (const href of releaseItems(r).flatMap(itemLinks)) {
			if (href.startsWith('https://')) continue
			if (!href.startsWith('/')) errors.push(`${r.version}: ${href} is neither a site path nor an https link`)
			else if (existsSync(built) && !distHas(built, href)) errors.push(`${r.version}: ${href} leads to no page`)
		}
	}

	return errors
}

/** Секция версии из CHANGELOG.md от release-please: от её заголовка до следующего `## `. */
export function changelogSection(markdown, version) {
	const lines = markdown.split('\n')
	const start = lines.findIndex((line) => /^##? \[?/.test(line) && line.includes(`${version}]`))

	if (start === -1) return ''

	const end = lines.findIndex((line, i) => i > start && /^##? /.test(line))

	return lines
		.slice(start, end === -1 ? undefined : end)
		.join('\n')
		.trim()
}

/** Дата релиза из заголовка секции: `(2026-10-19)`. */
export const sectionDate = (section) => section.match(/\((\d{4}-\d{2}-\d{2})\)/)?.[1]

/** Номера PR из секции: release-please пишет их как `([#88](...))`. */
export const sectionPulls = (section) => [...new Set([...section.matchAll(/\[#(\d+)\]/g)].map((m) => Number(m[1])))]

/** Пути страниц сборки, отсортированные: из чего выбирать ссылки для пунктов. */
export function distPages(dist) {
	if (!existsSync(dist)) return []

	const files = execFileSync('find', [dist, '-name', 'index.html', '-not', '-path', '*/_astro/*'], {
		encoding: 'utf8',
	})

	return files
		.split('\n')
		.filter(Boolean)
		.map((file) => file.slice(dist.length).replace(/index\.html$/, '') || '/')
		.sort()
}

const run = (cwd, cmd, args) => {
	try {
		return execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64e6 })
	} catch {
		return ''
	}
}

/**
 * Всё, что нужно, чтобы написать запись релиза: правила сайта, секция CHANGELOG.md, описания
 * PR (через `gh`, если он есть), изменённые файлы с прошлого тега, страницы сборки, последние
 * записи как образец тона и иконки. Markdown для чтения человеком или агентом.
 *
 * @param {string} cwd
 * @param {{ dist?: string, diffLimit?: number }} [options]
 */
export function changelogContext(cwd, { dist = 'dist', diffLimit = 40_000 } = {}) {
	const config = readConfig(cwd)

	if (!config) throw new Error(`neither package.json nor ${CONFIG_FILE} sets up a changelog`)

	const releases = existsSync(join(cwd, config.file)) ? readJson(join(cwd, config.file)) : []
	const markdown = existsSync(join(cwd, 'CHANGELOG.md')) ? readFileSync(join(cwd, 'CHANGELOG.md'), 'utf8') : ''
	const section = changelogSection(markdown, config.version)
	const previous = run(cwd, 'git', ['describe', '--tags', '--abbrev=0', 'HEAD^']).trim()
	const range = previous ? `${previous}..HEAD` : 'HEAD'
	const paths = [
		'--',
		'.',
		':!*.lock',
		':!package-lock.json',
		':!CHANGELOG.md',
		':!**/*.test.*',
		':!e2e',
		':!.github',
	]
	const diff = run(cwd, 'git', ['diff', range, ...paths])
	const icons = iconNames(cwd, config.icons)

	const pulls = sectionPulls(section).map((number) => {
		const pr = run(cwd, 'gh', [
			'pr',
			'view',
			String(number),
			'--json',
			'title,body',
			'--jq',
			'"\\(.title)\\n\\n\\(.body)"',
		])

		return pr ? `### #${number}\n\n${pr.trim()}` : `### #${number}\n\n(gh could not read it)`
	})

	const guide = existsSync(join(cwd, config.guide)) ? readFileSync(join(cwd, config.guide), 'utf8').trim() : ''
	const recent = visibleReleases(releases).slice(0, 3)
	const pages = distPages(join(cwd, dist))
	const date = sectionDate(section) ?? new Date().toISOString().slice(0, 10)
	const has = releases.some((r) => r?.version === config.version)

	return [
		`# Changelog entry for ${config.version}`,
		has ? `**${config.file} already has a ${config.version} entry.**` : '',
		`File: \`${config.file}\`. Version: \`${config.version}\`. Date: \`${date}\`.`,
		[
			'## Rules',
			'- The entry is for the reader of the site, not for a developer: what they will notice and why it helps them.',
			'- Leave out CI, refactoring, tests, dependencies and anything the reader cannot see.',
			'- Shape: `{ "version", "date", "title", "icon", "items": [] }`. A short title, a few items in plain language; a link inside an item is `[text](/path/)` to a page of the built site or `[text](https://…)` outside it.',
			config.locales.length
				? `- Write \`title\` and \`items\` in each of ${config.locales.join(', ')}: \`"title": { ${config.locales.map((l) => `"${l}": "…"`).join(', ')} }\`, \`"items": { ${config.locales.map((l) => `"${l}": []`).join(', ')} }\`. Each language reads as written in it, not as a translation.`
				: '',
			'- Nothing worth telling the reader: `{ "version", "hidden": true }`, the release still ships.',
			'- Add it with `site-changelog add <entry.json>`: it goes on top and the whole file is verified.',
		]
			.filter(Boolean)
			.join('\n'),
		guide && `## Site guide (${config.guide})\n\n${guide}`,
		section && `## CHANGELOG.md\n\n${section}`,
		pulls.length && `## Pull requests\n\n${pulls.join('\n\n')}`,
		recent.length && `## Recent entries, for the tone\n\n\`\`\`json\n${JSON.stringify(recent, null, '\t')}\n\`\`\``,
		icons &&
			`## Icons\n\nAny lucide-static export in PascalCase${config.icons.length ? `, or the site's own: ${config.icons.join(', ')}` : ''}. Used before: ${[...new Set(releases.map((r) => r?.icon).filter(Boolean))].join(', ') || 'none'}.`,
		pages.length
			? `## Pages of the build\n\n${pages.join('\n')}`
			: '## Pages of the build\n\nNo build found: run `npm run build` to check links.',
		diff &&
			`## Diff since ${previous || 'the start'}\n\n\`\`\`diff\n${diff.length > diffLimit ? `${diff.slice(0, diffLimit)}\n… cut at ${diffLimit} characters` : diff}\n\`\`\``,
	]
		.filter(Boolean)
		.join('\n\n')
}

/**
 * Вставляет запись в начало ченжлога (или заменяет запись той же версии) и возвращает
 * новый список. Файл пишет вызывающий.
 */
export function insertRelease(releases, entry) {
	return [entry, ...releases.filter((r) => r?.version !== entry.version)]
}

/**
 * Добавляет запись в ченжлог сайта: вставка, проверка всего файла, запись и Prettier сайта,
 * чтобы `format:check` не споткнулся. При ошибках файл не меняется.
 *
 * @returns {string[]} Ошибки; пустой массив -- запись добавлена.
 */
export function addRelease(cwd, entry, { dist = 'dist' } = {}) {
	const config = readConfig(cwd)

	if (!config) return [`neither package.json nor ${CONFIG_FILE} sets up a changelog`]

	const path = join(cwd, config.file)
	const before = existsSync(path) ? readFileSync(path, 'utf8') : null
	const releases = insertRelease(before ? JSON.parse(before) : [], entry)

	writeFileSync(path, `${JSON.stringify(releases, null, '\t')}\n`)

	const errors = verifyChangelog(cwd, { dist })

	if (errors.length) {
		if (before === null) rmSync(path)
		else writeFileSync(path, before)

		return errors
	}

	run(cwd, 'npx', ['--no-install', 'prettier', '--write', config.file])

	return []
}
