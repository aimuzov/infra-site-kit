import type { Component } from 'svelte'

import type { AstroComponent, InfoTipProps } from './types.js'

declare const C: AstroComponent<InfoTipProps> & Component<InfoTipProps>

export default C
