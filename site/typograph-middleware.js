import { typographHtml } from './typograph.js'

export function typographMiddleware(options = {}) {
	return async (_, next) => {
		const response = await next()
		if (!response.body) return response
		if (!/^text\/html(?:;|$)/i.test(response.headers.get('content-type') ?? '')) return response
		const html = await response.text()
		const root = html.match(/<html\b(?:"[^"]*"|'[^']*'|[^'">])*>/i)?.[0]
		const lang = Array.from(
			(root ?? '').matchAll(/\s+([^\s=<>/'"]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g),
		).find((attribute) => attribute[1].toLowerCase() === 'lang')
		const language = options.language ?? 'ru'
		if (
			!lang ||
			(lang[2] ?? lang[3] ?? lang[4] ?? '').toLowerCase().split('-')[0] !== language.toLowerCase().split('-')[0]
		)
			return new Response(html, response)
		const headers = new Headers(response.headers)
		headers.delete('content-length')
		return new Response(typographHtml(html, options), {
			status: response.status,
			statusText: response.statusText,
			headers,
		})
	}
}
