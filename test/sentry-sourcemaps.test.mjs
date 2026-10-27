import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { pathToFileURL } from 'node:url'

import { siteName, siteRelease } from '../site/sentry.js'
import sentrySourcemaps, { sentryEnv, sentryPluginOptions } from '../site/sentry-sourcemaps.js'

// Сайт во временном каталоге: package.json и, если надо, `.env`.
const site = (files = {}) => {
	const root = mkdtempSync(join(tmpdir(), 'sentry-maps-'))

	writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'sorebody', version: '2.4.0' }))

	for (const [name, content] of Object.entries(files)) writeFileSync(join(root, name), content)

	return root
}

// Прогон `astro:config:setup` с заглушкой плагина Sentry: что ушло в конфиг Vite и в плагин.
const setup = async (root, { command = 'build', env = {}, ...options } = {}) => {
	const calls = { config: null, plugin: null, warnings: [] }
	const logger = { info: () => {}, warn: (message) => calls.warnings.push(message) }
	const loadPlugin = async () => (pluginOptions) => {
		calls.plugin = pluginOptions

		return [{ name: 'sentry-stub' }]
	}
	const saved = { ...process.env }

	for (const key of Object.keys(process.env)) if (key.startsWith('SENTRY_')) delete process.env[key]

	Object.assign(process.env, env)

	try {
		await sentrySourcemaps({ loadPlugin, ...options }).hooks['astro:config:setup']({
			command,
			config: { root: pathToFileURL(`${root}/`), outDir: pathToFileURL(join(root, 'dist/')) },
			updateConfig: (config) => (calls.config = config),
			logger,
		})
	} finally {
		for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key]

		Object.assign(process.env, saved)
	}

	return { ...calls, logger }
}

test('without a token the build is left alone: no source maps, no plugin', async () => {
	const { config, plugin } = await setup(site())

	assert.equal(config, null)
	assert.equal(plugin, null)
})

test('the dev server never uploads, even with a token', async () => {
	const { config } = await setup(site(), { command: 'dev', env: { SENTRY_AUTH_TOKEN: 'token' } })

	assert.equal(config, null)
})

test('a token in .env turns on hidden source maps and the upload', async () => {
	const root = site({ '.env': 'SENTRY_AUTH_TOKEN=from-file\nSENTRY_ORG=aimuzov\nPUBLIC_SENTRY_DSN=x\n' })
	const { config, plugin } = await setup(root)

	assert.equal(config.vite.environments.client.build.sourcemap, 'hidden')
	assert.equal(plugin.authToken, 'from-file')
	assert.equal(plugin.org, 'aimuzov')
	assert.equal(plugin.project, 'sorebody')
})

test('the plugin runs only for the browser bundle', async () => {
	const { config } = await setup(site(), { env: { SENTRY_AUTH_TOKEN: 'token' } })
	const [plugin] = config.vite.plugins

	assert.equal(plugin.name, 'sentry-stub')
	assert.equal(plugin.applyToEnvironment({ name: 'client' }), true)
	assert.equal(plugin.applyToEnvironment({ name: 'ssr' }), false)
	assert.equal(plugin.applyToEnvironment({ name: 'prerender' }), false)
})

test('the release matches the one sentry.astro puts into events and is not injected twice', async () => {
	const root = site()
	const { plugin } = await setup(root, { env: { SENTRY_AUTH_TOKEN: 'token' } })

	assert.equal(plugin.release.name, siteRelease(root))
	assert.equal(plugin.release.inject, false)
	assert.equal(plugin.release.setCommits, false)
	assert.equal(plugin.telemetry, false)
})

test('the maps are deleted from the output after the upload', async () => {
	const root = site()
	const { plugin } = await setup(root, { env: { SENTRY_AUTH_TOKEN: 'token' } })

	assert.deepEqual(plugin.sourcemaps.filesToDeleteAfterUpload, [join(root, 'dist', '**/*.map')])
})

test('options of the integration win over the environment', async () => {
	const { plugin } = await setup(site(), {
		env: { SENTRY_AUTH_TOKEN: 'token', SENTRY_PROJECT: 'from-env' },
		project: 'from-options',
		release: 'custom@1',
	})

	assert.equal(plugin.project, 'from-options')
	assert.equal(plugin.release.name, 'custom@1')
})

test('a failed upload warns instead of failing the deploy', async () => {
	const { plugin, warnings } = await setup(site(), { env: { SENTRY_AUTH_TOKEN: 'token' } })

	plugin.errorHandler(new Error('401'))
	assert.match(warnings[0], /not uploaded to Sentry: 401/)
})

test('SENTRY_ variables come from .env files, the process environment wins', () => {
	const root = site({
		'.env': 'SENTRY_ORG=file\nSENTRY_PROJECT=file\nPUBLIC_SENTRY_DSN=dsn\n',
		'.env.production': 'SENTRY_PROJECT=production\n',
	})
	const env = sentryEnv(root, { SENTRY_ORG: 'process', HOME: '/root' })

	assert.deepEqual(env, { SENTRY_ORG: 'process', SENTRY_PROJECT: 'production' })
})

test('the maps are deleted only under the output directory, not across the project', () => {
	const options = sentryPluginOptions({ authToken: 'token', outDir: '/app/dist', logger: { warn: () => {} } })

	assert.deepEqual(options.sourcemaps.filesToDeleteAfterUpload, ['/app/dist/**/*.map'])
})

test('the project is the package name of the site', () => {
	assert.equal(siteName(site()), 'sorebody')
})

test('the package exports the integration and depends on the Vite plugin', () => {
	const pkg = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'package.json'), 'utf8'))

	assert.equal(pkg.exports['./sentry-sourcemaps.js'].default, './site/sentry-sourcemaps.js')
	assert.ok(pkg.dependencies['@sentry/vite-plugin'])
})
