import type { Component } from 'svelte'

import type { AstroComponent, FieldProps } from './types.js'

declare const C: AstroComponent<FieldProps> & Component<FieldProps>

export default C
