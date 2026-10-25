import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { compile } from 'svelte/compiler'

// Хук загрузчика Node: `.svelte` компилируется для сервера, и тест рендерит компонент
// через `svelte/server` без сборщика. Иконки lucide -- тоже `.svelte`, поэтому
// компилируются им же.
export async function load(url, context, nextLoad) {
	if (!url.endsWith('.svelte')) return nextLoad(url, context)

	const filename = fileURLToPath(url)
	const { js } = compile(await readFile(filename, 'utf8'), { filename, generate: 'server' })

	return { format: 'module', source: js.code, shortCircuit: true }
}
