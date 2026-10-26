import type { Component } from 'svelte'

import type { AstroComponent, LangSwitchProps } from './types.js'

// Меню ставят в шапку из Astro-layout, поэтому у него есть и сигнатура для Astro.
declare const C: Component<LangSwitchProps> & AstroComponent<LangSwitchProps>

export default C
