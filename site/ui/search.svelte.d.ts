import type { Component } from 'svelte'

import type { AstroComponent, SearchProps } from './types.js'

// `open()` открывает поиск из своей кнопки.
declare const C: AstroComponent<SearchProps> & Component<SearchProps, { open: () => void }>

export default C
