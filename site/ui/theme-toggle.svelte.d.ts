import type { Component } from 'svelte'

import type { AstroComponent, ThemeToggleProps } from './types.js'

declare const C: AstroComponent<ThemeToggleProps> & Component<ThemeToggleProps>

export default C
