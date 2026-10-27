import type { Component } from 'svelte'

import type { AstroComponent, ChipButtonProps } from './types.js'

declare const C: AstroComponent<ChipButtonProps> & Component<ChipButtonProps>

export default C
