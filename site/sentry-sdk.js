// Отдельный модуль, а не `import('@sentry/browser')` прямо в sentry-boot.js: так
// в чанк SDK попадает только то, что здесь названо, остальное вытряхивается.
export { captureException, init } from '@sentry/browser'
