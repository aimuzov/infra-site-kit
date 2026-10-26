import type { Component } from 'svelte'

import type { AstroComponent, PanelToggleProps } from './types.js'

// Кнопку ставят в разметку Astro-страницы рядом с панелью, поэтому у неё есть и сигнатура для Astro.
declare const C: Component<PanelToggleProps> & AstroComponent<PanelToggleProps>

export default C
