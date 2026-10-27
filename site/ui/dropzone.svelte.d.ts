import type { Component } from 'svelte'

import type { AstroComponent, DropzoneExports, DropzoneProps } from './types.js'

declare const C: AstroComponent<DropzoneProps> & Component<DropzoneProps, DropzoneExports>

export default C
