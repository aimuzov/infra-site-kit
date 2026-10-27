import type { Component } from 'svelte'

import type { AstroComponent, CopyValueProps } from './types.js'

declare const C: AstroComponent<CopyValueProps> & Component<CopyValueProps>

export default C
