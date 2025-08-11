<script lang="ts">
	import { deleteSchedule, getSchedule } from '$lib/main.remote';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
</script>

<svelte:boundary>
	{#snippet pending()}<p>Loading...</p>{/snippet}

	{#snippet failed()}
		<p>Something went wrong loading schedule</p>
	{/snippet}

	<form {...deleteSchedule}>
		<input type="hidden" name="id" value={params.id} />
		<button type="submit">Delete</button>
	</form>

	<pre>{JSON.stringify(await getSchedule(params.id), null, 4)}</pre>
</svelte:boundary>
