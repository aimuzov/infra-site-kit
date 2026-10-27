import type { Component } from 'svelte'

import type { AstroComponent, ButtonProps } from './types.js'

declare const C: AstroComponent<ButtonProps> & Component<ButtonProps>

export default C
