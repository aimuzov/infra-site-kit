import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

// Стенд компонентов `ui/` для e2e: в ките нет Astro-сайта, поэтому их собирает Vite
// так же, как собрал бы сайт, а `test/e2e/server.mjs` раздаёт сборку по `/ui/`.
export default defineConfig({
	root: import.meta.dirname,
	base: '/ui/',
	plugins: [svelte()],
	build: { outDir: 'dist', emptyOutDir: true },
	logLevel: 'warn',
})
