// Скрипт из sentry.astro: с настоящим SDK, который Vite выносит в чанк, как и на сайте.
import { bootSentry } from '../../site/sentry-boot.js'

const meta = document.querySelector('meta[name="sentry"]')

if (meta) bootSentry(JSON.parse(meta.content))
