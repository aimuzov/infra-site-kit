import type { Component } from 'svelte'

import type { AlertProps, AstroComponent } from './types.js'

declare const C: AstroComponent<AlertProps> & Component<AlertProps>

export default C
