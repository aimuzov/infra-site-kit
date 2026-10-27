<script lang="ts">
	import Card from '@aimuzov/infra-site-kit/ui/card.svelte'
	import ChipButton from '@aimuzov/infra-site-kit/ui/chip-button.svelte'
	import Dropzone from '@aimuzov/infra-site-kit/ui/dropzone.svelte'
	import Field from '@aimuzov/infra-site-kit/ui/field.svelte'
	import Input from '@aimuzov/infra-site-kit/ui/input.svelte'
	import Search from '@aimuzov/infra-site-kit/ui/search.svelte'

	let value = $state('')
	let search: ReturnType<typeof Search> | undefined = $state()
	let dropzone: ReturnType<typeof Dropzone> | undefined = $state()
</script>

<Card title="Upload" layout="row">
	{#snippet action()}
		<ChipButton onclick={() => dropzone?.pick()}>Replace</ChipButton>
	{/snippet}
	<Field label="Name" for="name">
		<Input id="name" bind:value code />
	</Field>
	<Dropzone bind:this={dropzone} accept=".zip" onfile={(file) => console.log(file.name)} />
	<Search bind:this={search} locale="en" />
	<ChipButton onclick={() => search?.open()}>Find</ChipButton>
</Card>
