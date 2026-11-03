const NBSP = ' '
const NNBSP = ' '

const PARTICLE = String.raw`(?:ли|же|бы)(?![\p{L}\d])`
const SHORT = String.raw`(?<![\p{L}\d])(?!${PARTICLE})(?:\p{L}{1,2}|без|для|вне|изо|меж|над|обо|ото|под|при|про)`
const shortInside = new RegExp(String.raw`(${SHORT})\s+(?=\S)`, 'giu')
const shortAtEnd = new RegExp(String.raw`(${SHORT})\s+$`, 'iu')
const particle = new RegExp(String.raw`(?<=[\p{L}\d])\s+(?=${PARTICLE})`, 'giu')
const abbr = /(?<![\p{L}\d])(т|г|гг|ул|пр|д|кв|см|стр|им|св|тел)\.\s+(?=\S)/giu
const initial = /(?<!\p{L})(\p{Lu}\.)\s+(?=\p{Lu})/gu
const numero = /([№§])\s*(?=\d)/g
const dash = /(?<=\S)\s+(?=[—·])/g
const unit = /(?<=\d)\s+(?=[\p{L}₽%°$€])/gu
const long = /(?<![\p{L}\d+.,#_-])\d{5,}(?![\p{L}\d_-]|\.[\p{L}\d_]|,\d)/gu
const phone = /(?:\+7|(?<!\d)8)(?:[\s()-]*\d){10}(?!\d)/g

export function typographText(text, options = {}) {
	const parts = split(text.replace(/\.{3}/g, '…'), phone)

	return parts
		.map((part, i) => {
			if (i % 2) return part.replace(/\s+/g, NBSP)

			const fixed = words(part, options)
			return i < parts.length - 1 ? fixed.replace(shortAtEnd, `$1${NBSP}`) : fixed
		})
		.join('')
}

function words(s, options) {
	const separator = options.thousandsSeparator ?? NNBSP
	const unitPattern = options.preserveLineBreaks ? /(?<=\d)[ \t]+(?=[\p{L}₽%°$€])/gu : unit
	const dashPattern = options.preserveLineBreaks ? /(?<=\S)[ \t]+(?=—)/g : dash
	return s
		.replace(long, (n) => n.replace(/\B(?=(\d{3})+$)/g, separator))
		.replace(/(?<=\d)[ \u00a0\u202f](?=\d{3}(?!\d))/g, separator)
		.replace(numero, `$1${NBSP}`)
		.replace(unitPattern, NBSP)
		.replace(dashPattern, NBSP)
		.replace(particle, NBSP)
		.replace(abbr, `$1.${NBSP}`)
		.replace(initial, `$1${NBSP}`)
		.replace(shortInside, `$1${NBSP}`)
}

const INLINE = /^(?:a|abbr|b|code|del|em|i|kbd|mark|q|s|small|span|strong|sub|sup|time|u)$/i
const RAW = /^(?:script|style|textarea)$/i
const PROTECTED = /^(?:pre|code|kbd)$/i
const P_END =
	/^(?:address|article|aside|blockquote|details|dialog|div|dl|dt|dd|fieldset|figcaption|figure|footer|form|h[1-6]|header|hgroup|hr|li|main|menu|nav|ol|p|pre|search|section|table|ul)$/i
const P_SCOPE = /^(?:applet|button|caption|html|table|td|th|marquee|object|template|pre|code|kbd)$/i
const LI_SCOPE = /^(?:ul|ol|menu|html|template|pre|code|kbd)$/i
const DL_SCOPE = /^(?:dl|html|template|pre|code|kbd)$/i
const VOID = /^(?:area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/i
const TAG = /<!--[\s\S]*?-->|<(?:(?:"[^"]*"|'[^']*'|[^'">])*)>/g
const ATTR = /\s+([^\s=<>/'"]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g

export function typographHtml(html, options = {}) {
	const language = (options.language ?? 'ru').toLowerCase().split('-')[0]
	const stack = []
	const parts = []
	let last = 0
	const tags = new RegExp(TAG.source, 'g')
	for (let match; (match = tags.exec(html));) {
		const protectedText = stack.some((entry) => entry.protected)
		parts.push({ value: html.slice(last, match.index), text: true, protected: protectedText })
		const tag = match[0]
		const name = tag.match(/^<\/?([a-z][\w:-]*)/i)?.[1]?.toLowerCase()
		const closing = tag.startsWith('</')
		if (name && !closing) {
			if (P_END.test(name)) endInScope(stack, ['p'], P_SCOPE)
			if (name === 'li') endInScope(stack, ['li'], LI_SCOPE)
			if (name === 'dt' || name === 'dd') endInScope(stack, ['dt', 'dd'], DL_SCOPE)
		}
		if (name && !closing && RAW.test(name)) {
			const close = new RegExp(`</${name}\\s*>`, 'gi')
			close.lastIndex = match.index + tag.length
			const end = close.exec(html)
			last = end ? end.index + end[0].length : html.length
			tags.lastIndex = last
			parts.push({
				value: html.slice(match.index, last),
				inlineOpen: INLINE.test(name),
				inlineClose: INLINE.test(name),
			})
			continue
		}
		parts.push({
			value: tag,
			inlineOpen: name && !closing && INLINE.test(name),
			inlineClose: name && closing && INLINE.test(name),
		})
		if (name && closing) {
			const index = stack.findLastIndex((entry) => entry.name === name)
			if (index >= 0) stack.length = index
		} else if (name && !VOID.test(name) && !/\/\s*>$/.test(tag)) {
			const lang = Array.from(tag.matchAll(ATTR)).find((attribute) => attribute[1].toLowerCase() === 'lang')
			const foreign = lang && (lang[2] ?? lang[3] ?? lang[4] ?? '').toLowerCase().split('-')[0] !== language
			stack.push({ name, protected: !!foreign || PROTECTED.test(name) })
		}
		last = match.index + tag.length
	}
	parts.push({ value: html.slice(last), text: true, protected: stack.some((entry) => entry.protected) })
	return parts
		.map((part, i) => {
			if (!part.text || part.protected || !part.value.trim()) return part.value
			let value = typographText(part.value, options)
			if (parts[i + 1]?.inlineOpen) value = value.replace(shortAtEnd, `$1${NBSP}`)
			if (parts[i - 1]?.inlineClose) value = value.replace(/^\s+(?=[—·])/, NBSP)
			return value
		})
		.join('')
}

function endInScope(stack, names, boundary) {
	for (let i = stack.length - 1; i >= 0; i--) {
		const name = stack[i].name
		if (names.includes(name)) {
			stack.length = i
			return
		}
		if (boundary.test(name)) return
	}
}

function split(s, re) {
	const out = []
	let last = 0

	for (const m of s.matchAll(re)) {
		out.push(s.slice(last, m.index), m[0])
		last = m.index + m[0].length
	}

	out.push(s.slice(last))

	return out
}
