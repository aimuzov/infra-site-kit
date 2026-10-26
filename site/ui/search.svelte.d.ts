import type { Component } from 'svelte'

import type { AstroComponent, SearchProps } from './types.js'

// Поиск ставят в шапку из Astro-layout, как и кнопку темы. `open()` открывает его из своей кнопки.
declare const C: Component<SearchProps, { open: () => void }> & AstroComponent<SearchProps>

export default C
