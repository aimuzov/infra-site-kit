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
	import Skeleton from '../../site/ui/skeleton.svelte'

	let taken = $state('')
	let value = $state('')

	/** @type {{ pick: () => void }} */
	let zone
</script>

<main style="display: grid; gap: 1rem; max-width: 40rem; margin: 2rem auto; padding: 0 1rem; font-family: system-ui">
	<Card title="Выгрузка" info="Справка о выгрузке">
		{#snippet action()}<ChipButton onclick={() => zone.pick()}>Заменить</ChipButton>{/snippet}
		<Dropzone bind:this={zone} accept=".json,application/json" maxSize={1024} note="result.json" onfile={(file) => (taken = file.name)} />
		<p data-taken>{taken}</p>
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
