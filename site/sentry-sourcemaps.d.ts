import type { AstroIntegration } from 'astro'

/** Подмена переменных `SENTRY_*` сборки. */
export type SentrySourcemapsOptions = {
	/** По умолчанию `SENTRY_AUTH_TOKEN`; без токена интеграция ничего не делает. */
	authToken?: string
	/** По умолчанию `SENTRY_ORG`. */
	org?: string
	/** По умолчанию `SENTRY_PROJECT`, а без него имя из package.json сайта. */
	project?: string
	/** По умолчанию `SENTRY_URL`, а без него sentry.io. */
	url?: string
	/** Тот же, что у `<Sentry release>`, по умолчанию `<name>@<version>` из package.json. */
	release?: string
}

/** Переменные `SENTRY_*` из `.env`-файлов сайта и окружения процесса; окружение важнее. */
export function sentryEnv(root: string, env?: Record<string, string | undefined>): Record<string, string>

/**
 * Интеграция Astro: с `SENTRY_AUTH_TOKEN` грузит source maps браузерного бандла
 * в Sentry и удаляет их из `dist`.
 */
export default function sentrySourcemaps(options?: SentrySourcemapsOptions): AstroIntegration
