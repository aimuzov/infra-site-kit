import type { Component } from 'svelte'

import type { AstroComponent, ThemeToggleProps } from './types.js'

// Кнопку ставят в шапку из Astro-layout, поэтому у неё есть и сигнатура для Astro.
declare const C: Component<ThemeToggleProps> & AstroComponent<ThemeToggleProps>

export default C
