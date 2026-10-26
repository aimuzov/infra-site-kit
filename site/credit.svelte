<script>
	import { t } from './i18n.js'
	import { MARK } from './mark.js'

	/**
	 * @typedef {object} Props
	 * @property {string} [repo] Исходники сайта, показываются ссылкой со значком GitHub.
	 * @property {boolean} [copyright] Ставит год копирайта в начало, по умолчанию включено.
	 * @property {'spread' | 'center'} [align] `spread` растягивает подпись по контейнеру:
	 *   автор слева, исходники справа. `center` держит обе части по центру.
	 * @property {string} [locale] Язык подписи, по умолчанию `ru`.
	 * @property {string} [class]
	 */

	/** @type {Props} */
	let { repo, copyright = true, align = 'spread', locale = 'ru', class: className } = $props()

	// Сервер рендерит год сборки. Приложение с рендером на клиенте сразу получает текущий,
	// а статическая страница исправляет его через `syncYear` (это делает credit.astro).
	const year = new Date().getFullYear()


	// Значок GitHub из Octicons (MIT).
	const GITHUB = 'M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z'
</script>

<!-- С мышью сначала выглядывает только лицо, а строка выезжает снизу при наведении
     или фокусе с клавиатуры. На тач-экранах наведения нет, поэтому там вся строка
     видна сразу. -->
<span class={['credit', `credit--${align}`, className]}>
	<span class="credit__peek" aria-hidden="true">
		<svg class="credit__icon credit__icon--peek credit__icon--mark" viewBox="-3 0 30.1 24" width="20" height="16" fill="currentColor">
			<path fill-rule="evenodd" d={MARK} />
		</svg>
	</span>
	<!-- Внутри каждой части обычная строка текста: у слов настоящие пробелы, а иконки
	     масштабируются вместе со шрифтом. Части переносятся блоками, поэтому вторая
	     никогда не начинается с отступом. -->
	<span class="credit__line">
		<span class="credit__group">
			{#if copyright}<span class="credit__year"><span data-year>{year}</span> ©</span>{/if}
			{t(locale, 'credit.made')}
			<a class="credit__link" href="https://github.com/aimuzov" target="_blank" rel="noopener"
				><svg class="credit__icon credit__icon--mark" viewBox="-3 0 30.1 24" width="20" height="16" fill="currentColor" aria-hidden="true"
					><path fill-rule="evenodd" d={MARK} /></svg
				>aimuzov</a
			>
		</span>
		{#if repo}
			<a class="credit__link" href={repo} target="_blank" rel="noopener"
				><svg class="credit__icon" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"
					><path d={GITHUB} /></svg
				>{t(locale, 'credit.source')}</a
			>
		{/if}
	</span>
</span>

<style>
	/*
	 * Снаружи подпись настраивается переменными, умолчания повторяют прежний вид:
	 * --credit-color, --credit-hover, --credit-gap
	 * и пара цветов расслоения --credit-glitch-a и --credit-glitch-b.
	 */
	.credit {
		position: relative;
		display: block;
		width: 100%;
		color: var(--credit-color, inherit);

		&__line {
			display: flex;
			flex-wrap: wrap;
			gap: var(--credit-gap, 0.25em 0.9em);
		}

		&--spread &__line {
			justify-content: space-between;
		}

		&--center &__line,
		&--center &__peek {
			justify-content: center;
		}

		&__peek {
			display: none;
		}

		&__group,
		&__link {
			white-space: nowrap;
		}

		/* Год стоит отдельно от фразы, обычный пробел склеил бы их в одно слово. */
		&__year {
			margin-right: 0.5em;
		}

		&__link {
			color: inherit;
			text-underline-offset: 0.2em;

			&:hover {
				color: var(--credit-hover, inherit);
			}
		}

		/* Размер от шрифта, стоит на строке как заглавная буква. */
		&__icon {
			display: inline-block;
			width: auto;
			height: 1.15em;
			margin-right: 0.3em;
			vertical-align: -0.2em;

			&--peek {
				height: 1.4em;
				margin: 0;
			}

			/* Лицо неподвижно и раз в пять секунд шевелит усами. */
			&--mark {
				transform-origin: 50% 70%;
			}
		}
	}

	/* Раз в восемь секунд подпись глючит несколько кадров: текст теряет сигнал
	   и мерцает, а иконки в тот же момент расслаиваются на красную и бирюзовую
	   копии. Только фильтры, поэтому opacity выглядывания и transform шевеления
	   не затрагиваются. */
	.credit__line {
		animation: signal 8s steps(1) infinite;
	}

	.credit__icon {
		animation: rgb-split 8s steps(1) infinite;
	}

	.credit__icon--mark {
		animation:
			wiggle 5s ease-in-out infinite,
			rgb-split 8s steps(1) infinite;
	}

	@keyframes signal {
		0%,
		88%,
		100% {
			filter: none;
		}

		89% {
			filter: opacity(0.35);
		}

		90% {
			filter: blur(0.4px);
		}

		91% {
			filter: opacity(0.6);
		}

		92% {
			filter: none;
		}
	}

	@keyframes rgb-split {
		0%,
		88%,
		100% {
			filter: none;
		}

		89% {
			filter: drop-shadow(-0.12em 0 var(--credit-glitch-a, rgb(255 0 90 / 70%)))
				drop-shadow(0.12em 0 var(--credit-glitch-b, rgb(0 210 255 / 70%)));
		}

		90.5% {
			filter: drop-shadow(0.12em 0 var(--credit-glitch-a, rgb(255 0 90 / 70%)))
				drop-shadow(-0.12em 0 var(--credit-glitch-b, rgb(0 210 255 / 70%)));
		}

		92% {
			filter: drop-shadow(-0.06em 0 color-mix(in srgb, var(--credit-glitch-a, rgb(255 0 90 / 70%)) 70%, transparent))
				drop-shadow(0.06em 0 color-mix(in srgb, var(--credit-glitch-b, rgb(0 210 255 / 70%)) 70%, transparent));
		}

		93% {
			filter: none;
		}
	}

	@keyframes wiggle {
		0%,
		86%,
		100% {
			transform: rotate(0);
		}

		88% {
			transform: rotate(-14deg);
		}

		90% {
			transform: rotate(12deg);
		}

		92% {
			transform: rotate(-9deg);
		}

		94% {
			transform: rotate(6deg);
		}

		96% {
			transform: rotate(-3deg);
		}
	}

	@media (hover: hover) and (pointer: fine) {
		.credit {
			overflow: hidden;

			&__peek {
				position: absolute;
				inset: 0;
				display: flex;
				align-items: center;
				pointer-events: none;
				transition:
					transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1),
					opacity 0.3s;
			}

			&__line {
				transform: translateY(110%);
				opacity: 0;
				transition:
					transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1),
					opacity 0.3s;
			}

			&:hover,
			&:focus-within {
				.credit__peek {
					transform: translateY(-110%);
					opacity: 0;
				}

				.credit__line {
					transform: none;
					opacity: 1;
				}
			}
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.credit__peek,
		.credit__line {
			transition: none;
		}

		.credit__line,
		.credit__icon,
		.credit__icon--mark {
			animation: none;
		}
	}
</style>
