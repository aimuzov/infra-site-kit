// Отдельный модуль, а не `import('@sentry/browser')` прямо в sentry-boot.js: так
// в чанк SDK попадает только то, что здесь названо, остальное вытряхивается.
// Чистка событий без SDK не нужна, поэтому едет в том же чанке.
export { captureException, init } from '@sentry/browser'
export { cleanBreadcrumb, scrubEvent } from './sentry-scrub.js'
