import type { Component } from 'svelte'

import type { AstroComponent, InputProps } from './types.js'

declare const C: AstroComponent<InputProps> & Component<InputProps, {}, 'value'>

export default C
