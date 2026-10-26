import type { Component } from 'svelte'

// credit.svelte написан на чистом JS, поэтому svelte-check на TypeScript-сайте
// видит его импорт как `any` и падает. Эта декларация даёт ему пропсы.
declare const Credit: Component<{
	/** Исходники сайта, показываются ссылкой со значком GitHub. */
	repo?: string
	/** Ставит год копирайта в начало, по умолчанию включено. */
	copyright?: boolean
	/** `spread` уводит исходники к правому краю контейнера, `center` держит обе части
	 * по центру. */
	align?: 'spread' | 'center'
	/** Язык подписи, по умолчанию \`ru\`. */
	locale?: string
	class?: string
}>

export default Credit
