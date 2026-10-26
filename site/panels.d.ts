/** Префикс ключей в localStorage по умолчанию. */
export const PANELS_PREFIX: 'site'

/** Ключ панели в localStorage: `<prefix>:panel-<имя>`. */
export function panelKey(name: string, prefix?: string): string

/** Скрыта ли панель: на корне стоит `data-panel-<имя>="hidden"`. */
export function isPanelHidden(name: string): boolean

/** Скрывает или показывает панель и запоминает выбор на устройстве. */
export function setPanelHidden(name: string, hidden: boolean, options?: { prefix?: string }): void

/** Переключает панель, возвращает, скрыта ли она после клика. */
export function togglePanel(name: string, options?: { prefix?: string }): boolean

/** Следит за панелью: первый вызов сразу, дальше при каждой смене. Возвращает отписку. */
export function watchPanel(name: string, callback: (hidden: boolean) => void): () => void
