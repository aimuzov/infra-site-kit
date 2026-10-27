import type { Component } from 'svelte'

import type { AstroComponent, SkeletonProps } from './types.js'

declare const C: AstroComponent<SkeletonProps> & Component<SkeletonProps>

export default C
