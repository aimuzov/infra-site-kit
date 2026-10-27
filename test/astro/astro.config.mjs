import svelte from '@astrojs/svelte'
import { defineConfig } from 'astro/config'

// Сайт только для `npm run check`: astro check и svelte-check смотрят, что части `ui/`
// принимают и Astro-слот, и Svelte-сниппет. Собирать его не нужно.
export default defineConfig({ integrations: [svelte()] })
