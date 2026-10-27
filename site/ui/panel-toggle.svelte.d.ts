import type { Component } from 'svelte'

import type { AstroComponent, PanelToggleProps } from './types.js'

declare const C: AstroComponent<PanelToggleProps> & Component<PanelToggleProps>

export default C
