<script>
	import Alert from '../../site/ui/alert.svelte'
	import Badge from '../../site/ui/badge.svelte'
	import Button from '../../site/ui/button.svelte'
	import Card from '../../site/ui/card.svelte'
	import ChipButton from '../../site/ui/chip-button.svelte'
	import CopyValue from '../../site/ui/copy-value.svelte'
	import Dropzone from '../../site/ui/dropzone.svelte'
	import Field from '../../site/ui/field.svelte'
	import Input from '../../site/ui/input.svelte'
	import LangSwitch from '../../site/ui/lang-switch.svelte'
	import PanelToggle from '../../site/ui/panel-toggle.svelte'
	import Search from '../../site/ui/search.svelte'
	import Skeleton from '../../site/ui/skeleton.svelte'
	import { pickFile } from '../../site/ui/files.js'

	let taken = $state('')
	let value = $state('')
	let closed = $state(0)

	/** @type {{ pick: () => void }} */
	let zone
	/** @type {{ open: () => void }} */
	let docs
</script>

<main style="display: grid; gap: 1rem; max-width: 40rem; margin: 2rem auto; padding: 0 1rem; font-family: system-ui">
	<div style="display: flex; gap: 0.5rem; justify-content: flex-end">
		<Search bundle="/ui/pagefind/" />
		<LangSwitch locale="ru" path="/ui/" />
		<PanelToggle panel="demo" controls="stand-panel" side="right" name="оглавление" prefix="stand" />
	</div>
	<div style="--ui-search-hit-border: 1px; --ui-hover-border: rgb(255 0 0)">
		<button type="button" onclick={() => docs.open()}>Найти в доках</button>
		<Search
			bind:this={docs}
			bundle="/ui/pagefind/"
			button={false}
			closeButton={false}
			shortcut={false}
			vimKeys
			strings={{ ru: { 'search.open': 'Поиск по стенду', 'search.placeholder': 'Что ищем?' } }}
			onclose={() => closed++}
		>
			{#snippet prompt()}<span class="stand-prompt">/</span>{/snippet}
			{#snippet empty(query)}Пусто: <strong>{query}</strong>{/snippet}
		</Search>
		<span data-closed>{closed}</span>
	</div>
	<aside id="stand-panel">Панель стенда</aside>
	<Card title="Выгрузка" info="Справка о выгрузке">
		{#snippet action()}<ChipButton onclick={() => zone.pick()}>Заменить</ChipButton>{/snippet}
		<Dropzone bind:this={zone} accept=".json,application/json" maxSize={1024} note="result.json" onfile={(file) => (taken = file.name)} />
		<p data-taken>{taken}</p>
		<ChipButton onclick={async () => (taken = (await pickFile('.json'))?.name ?? 'cancelled')}>Выбрать вне зоны</ChipButton>
	</Card>
	<Card title="Данные" tone="danger">
		<Field label="Токен" for="token" hint="Из настроек профиля" missing={!value}>
			<Input id="token" bind:value placeholder="Вставьте токен" />
		</Field>
		<div style="display: flex; gap: 0.5rem">
			<Button>Сохранить</Button>
			<Button variant="outline">Отмена</Button>
			<Button variant="ghost">Выйти</Button>
			<Button variant="danger">Удалить</Button>
		</div>
		<p><Badge>новое</Badge> <Badge mono>№ 12</Badge> <CopyValue label="ИНН" value="7700000000" /></p>
		<Alert variant="danger" title="Не вышло">Сервер не ответил</Alert>
		<Skeleton width="12rem" />
	</Card>
	<Dropzone disabled onfile={() => (taken = 'disabled')} title="Выключена" />
</main>
