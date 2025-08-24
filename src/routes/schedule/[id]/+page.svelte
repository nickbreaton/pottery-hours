<script lang="ts">
	import Calendar from '$lib/components/Calendar.svelte';
	import { getSchedule } from '$lib/main.remote';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
</script>

<svelte:boundary>
	{#snippet pending()}<p>Loading...</p>{/snippet}

	{#snippet failed()}
		<p>Something went wrong loading schedule</p>
	{/snippet}

	{#key params.id}
		{@render contents()}
	{/key}
</svelte:boundary>

{#snippet contents()}
	{@const schedule = await getSchedule(params.id)}

	<Calendar days={schedule.days} id={params.id} />
{/snippet}
