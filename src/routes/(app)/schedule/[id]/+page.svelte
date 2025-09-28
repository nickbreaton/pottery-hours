<script lang="ts">
	import Calendar from '$lib/components/Calendar.svelte';
	import { getSchedule } from '$lib/main.remote';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();

	const schedule = $derived(await getSchedule(params.id));
</script>

<Calendar id={params.id} days={schedule.days} published={schedule.published} />
