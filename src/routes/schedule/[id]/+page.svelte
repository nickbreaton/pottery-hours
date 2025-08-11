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

	<button onclick={() => deleteSchedule(params.id)}>Delete</button>
	<pre>{JSON.stringify(await getSchedule(params.id), null, 4)}</pre>
</svelte:boundary>
