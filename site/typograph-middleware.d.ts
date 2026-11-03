import type { MiddlewareHandler } from 'astro'

import type { TypographOptions } from './typograph.js'

export function typographMiddleware(options?: TypographOptions): MiddlewareHandler
