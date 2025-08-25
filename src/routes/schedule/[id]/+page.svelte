<script lang="ts">
	import Calendar from '$lib/components/Calendar.svelte';
	import { getSchedule } from '$lib/main.remote';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
</script>

<svelte:boundary>
	{#snippet pending()}
		<!-- ignore -->
	{/snippet}

	{#snippet failed()}
		<p>Something went wrong loading schedule</p>
	{/snippet}

	{@const schedule = await getSchedule(params.id)}

	<Calendar id={params.id} days={schedule.days} published={schedule.published} />
</svelte:boundary>
