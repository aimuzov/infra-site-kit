<script>
	import Check from '@lucide/svelte/icons/check'
	import Copy from '@lucide/svelte/icons/copy'

	/**
	 * @typedef {object} Props
	 * @property {string} value
	 * @property {string} [label] Что это за значение: подпись слева, подсказка и озвучка кнопки.
	 */

	/** @type {Props} */
	let { value, label } = $props()

	let copied = $state(false)

	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let timer

	async function copy() {
		try {
			await navigator.clipboard.writeText(value)
		} catch {
			// Буфер закрыт (не https или запрет браузера). Галочку не показываем, значение видно и так.
			return
		}

		copied = true
		clearTimeout(timer)
		timer = setTimeout(() => (copied = false), 1500)
	}
</script>

<!-- Номера и адреса переписывают в другие места руками: скопировать проще, чем перепечатать. -->
<span class="copy">
	{#if label}<span class="copy__label">{label}</span>{/if}
	<button
		tabindex="-1"
		type="button"
		class={['copy__button', copied && 'copy__button--done']}
		title={copied ? 'Скопировано' : `Скопировать ${label ?? ''}`.trim()}
		aria-label={`Скопировать ${label ?? ''} ${value}`.replace(/\s+/g, ' ')}
		onclick={copy}
	>
		<span class="copy__value">{value}</span>
		{#if copied}<Check size={12} />{:else}<Copy size={12} />{/if}
	</button>
	<span class="copy__status" role="status">{copied ? 'Скопировано' : ''}</span>
</span>

<style>
	.copy {
		display: inline-flex;
		gap: 0.25rem;
		align-items: center;
		white-space: nowrap;

		& .copy__label {
			color: var(--ui-muted);
		}

		/* Подложка -- полупрозрачный цвет текста: ложится на любую плашку, не споря с её тоном. */
		& .copy__button {
			cursor: pointer;
			display: inline-flex;
			gap: 0.3125rem;
			align-items: center;
			padding: 0.0625rem 0.375rem;
			border: 1px solid color-mix(in oklch, var(--ui-fg) 10%, transparent);
			border-radius: 0.375rem;
			font: inherit;
			color: var(--ui-fg);
			background: color-mix(in oklch, var(--ui-fg) 6%, transparent);
			transition:
				background-color 0.15s,
				border-color 0.15s,
				color 0.15s;

			@media (prefers-reduced-motion: reduce) {
				transition: none;
			}

			&:hover {
				border-color: var(--ui-hover-border);
				color: var(--ui-hover-fg);
				background: var(--ui-hover-bg);
			}

			&.copy__button--done,
			&.copy__button--done:hover {
				border-color: color-mix(in oklch, var(--ui-success) 35%, transparent);
				color: var(--ui-success);
				background: color-mix(in oklch, var(--ui-success) 14%, transparent);
			}
		}

		& .copy__value {
			font-family: var(--ui-font-mono);
			font-variant-numeric: tabular-nums;
		}

		/* Только для читалок: объявляет, что значение скопировано. */
		& .copy__status {
			position: absolute;
			overflow: hidden;
			width: 1px;
			height: 1px;
			white-space: nowrap;
			clip-path: inset(50%);
		}
	}
</style>
