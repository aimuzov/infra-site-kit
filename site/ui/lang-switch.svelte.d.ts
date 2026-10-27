import type { Component } from 'svelte'

import type { AstroComponent, LangSwitchProps } from './types.js'

declare const C: AstroComponent<LangSwitchProps> & Component<LangSwitchProps>

export default C
