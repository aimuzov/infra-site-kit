import type { Component } from 'svelte'

import type { AstroComponent, BadgeProps } from './types.js'

declare const C: AstroComponent<BadgeProps> & Component<BadgeProps>

export default C
