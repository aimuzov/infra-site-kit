type FileLike = { name: string; type: string }

/** Подходит ли файл под строку `accept`, как у `<input type="file">`. Пустая пропускает всё. */
export function matchesAccept(file: FileLike, accept?: string): boolean

/** Размер для человека: «512 КБ», «1,4 МБ». */
export function formatSize(bytes: number): string

/** Почему файл не подходит, или `null`. */
export function rejectFile(
	file: FileLike & { size: number },
	rules?: { accept?: string; maxSize?: number },
): string | null
