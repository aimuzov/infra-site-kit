import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Сторона сборки для sentry.astro: релиз сайта и источник для CSP.
// Браузерная часть -- sentry-boot.js.

/**
 * Разбирает DSN проекта Sentry. Битый DSN роняет сборку: без него ошибки
 * молча никуда не уйдут.
 *
 * @param dsn - DSN вида `https://<key>@o1.ingest.sentry.io/2`.
 */
export function parseDsn(dsn) {
	let url
	try {
		url = new URL(dsn)
	} catch {
		throw new TypeError(`Sentry DSN must be a URL, got ${dsn}`)
	}

	if (url.protocol !== 'https:' || !url.username || !/^\/\d+$/.test(url.pathname)) {
		throw new TypeError(`Sentry DSN must look like https://<key>@<host>/<project id>, got ${dsn}`)
	}

	return url
}

/** Что нужно Sentry в CSP сверх собственных источников сайта: SDK грузится с самого сайта. */
export const sentryCsp = (dsn) => ({ directives: [`connect-src ${parseDsn(dsn).origin}`] })

const sitePackage = (root) => JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

/**
 * Имя сайта из package.json: им же назван проект в Sentry.
 *
 * @param root - Корень сайта, по умолчанию каталог, откуда запущена сборка.
 */
export function siteName(root = process.cwd()) {
	const { name } = sitePackage(root)

	if (!name) throw new TypeError(`package.json in ${root} needs a name for the Sentry project`)

	return name
}

/**
 * Релиз `<name>@<version>` из package.json сайта, тот же, что потом
 * понадобится при загрузке source maps.
 *
 * @param root - Корень сайта, по умолчанию каталог, откуда запущена сборка.
 */
export function siteRelease(root = process.cwd()) {
	const { name, version } = sitePackage(root)

	if (!name || !version) {
		throw new TypeError(`package.json in ${root} needs a name and a version for the Sentry release`)
	}

	return `${name}@${version}`
}
