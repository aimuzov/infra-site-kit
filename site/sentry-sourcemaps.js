import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseEnv } from 'node:util'

import { siteName, siteRelease } from './sentry.js'

// Загрузка source maps в Sentry при `astro build`. Включается только токеном:
// без него сборка та же, что и без интеграции, карт нет вовсе.

const ENV_FILES = ['.env', '.env.local', '.env.production', '.env.production.local']

/**
 * Переменные `SENTRY_*` так, как их видит Vite при сборке: из `.env`-файлов
 * сайта, а окружение процесса важнее. Astro кладёт `.env` в `import.meta.env`,
 * но не в `process.env` конфига, а на сервере токен приходит как раз в `.env`.
 *
 * @param root - Корень сайта.
 * @param env - Окружение процесса.
 */
export function sentryEnv(root, env = process.env) {
	const files = ENV_FILES.map((name) => join(root, name)).filter((path) => existsSync(path))
	const merged = Object.assign({}, ...files.map((path) => parseEnv(readFileSync(path, 'utf8'))), env)

	return Object.fromEntries(Object.entries(merged).filter(([key]) => key.startsWith('SENTRY_')))
}

/**
 * Опции `sentryVitePlugin`. Релиз тот же, что ставит в событиях sentry.astro, но
 * в бандл его не вписываем: это уже делает sentry.astro. Карты связываются с кодом
 * по debug ID, а после загрузки удаляются, чтобы не уехать на сайт.
 *
 * @param settings - Токен, организация, проект, релиз и логгер сборки.
 */
export const sentryPluginOptions = ({ authToken, org, project, url, release, outDir, logger }) => ({
	authToken,
	org,
	project,
	url,
	telemetry: false,
	release: { name: release, inject: false, setCommits: false },
	sourcemaps: { filesToDeleteAfterUpload: [join(outDir, '**/*.map')] },
	// Без загрузки карт сайт работает как прежде, а сбой Sentry не должен держать деплой.
	errorHandler: (error) => logger.warn(`Source maps were not uploaded to Sentry: ${error.message}`),
})

/**
 * Интеграция Astro: с `SENTRY_AUTH_TOKEN` собирает скрытые source maps
 * (без `sourceMappingURL` в бандлах), грузит их в Sentry и удаляет из `dist`.
 *
 * @param options - Подмена переменных `SENTRY_*` и релиза.
 * @param options.loadPlugin - Загрузчик `sentryVitePlugin`, подменяется в тестах.
 */
export default function sentrySourcemaps({
	loadPlugin = async () => (await import('@sentry/vite-plugin')).sentryVitePlugin,
	...options
} = {}) {
	return {
		name: '@aimuzov/infra-site-kit/sentry-sourcemaps',
		hooks: {
			'astro:config:setup': async ({ command, config, updateConfig, logger }) => {
				if (command !== 'build') return

				const root = fileURLToPath(config.root)
				const env = sentryEnv(root)
				const authToken = options.authToken ?? env.SENTRY_AUTH_TOKEN

				if (!authToken) return

				const release = options.release ?? siteRelease(root)
				const project = options.project ?? env.SENTRY_PROJECT ?? siteName(root)
				const outDir = fileURLToPath(config.outDir)
				const org = options.org ?? env.SENTRY_ORG
				const url = options.url ?? env.SENTRY_URL
				const sentryVitePlugin = await loadPlugin()
				const plugins = sentryVitePlugin(
					sentryPluginOptions({ authToken, org, project, url, release, outDir, logger }),
				)

				logger.info(`Uploading source maps of ${release} to Sentry project ${project}`)

				updateConfig({
					vite: {
						build: { sourcemap: 'hidden' },
						// Серверная сборка Astro только рендерит страницы, в браузер её код не попадает.
						plugins: plugins.map((plugin) => ({
							...plugin,
							applyToEnvironment: ({ name }) => name === 'client',
						})),
					},
				})
			},
		},
	}
}
