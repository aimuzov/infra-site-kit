import type { Component } from 'svelte'

import type { AstroComponent, CardProps } from './types.js'

declare const C: AstroComponent<CardProps> & Component<CardProps>

export default C
