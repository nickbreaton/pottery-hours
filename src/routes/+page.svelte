<script lang="ts">
	import { replaceState } from '$app/navigation';
	import { getSchedule, getSchedules } from '$lib/main.remote';
	import type { ScheduleDay } from '$lib/server/schema';
	import type { EventHandler } from 'svelte/elements';
	import type { CompleteEvent, DayEvent, InvalidEvent } from './api/new/schema';

	let sse: EventSource | null = $state(null);
	let validationMessage: string | null = $state(null);
	let days: (typeof ScheduleDay.Encoded)[] = $state([]);

	$effect(() => {
		if (!sse) return;

		sse.addEventListener('day', (event) => {
			const data: typeof DayEvent.Encoded = JSON.parse(event.data);
			days.push(data.data);
		});

		sse.addEventListener('invalid', (event) => {
			const data: typeof InvalidEvent.Encoded = JSON.parse(event.data);

			validationMessage = data.message;
			sse?.close();
		});

		sse.addEventListener('complete', async (event) => {
			const data: typeof CompleteEvent.Encoded = JSON.parse(event.data);

			sse?.close();
			await Promise.all([getSchedule(data.id).refresh(), getSchedules().refresh()]);

			replaceState(`/schedule/${data.id}`, {});
		});

		return () => {
			sse?.close();
		};
	});

	const submit: EventHandler<SubmitEvent, HTMLFormElement> = (event) => {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);
		const searchParams = new URLSearchParams(formData as {});
		sse?.close();
		sse = new EventSource(`/api/new?${searchParams}`);
	};
</script>

<form onsubmit={submit}>
	<input
		type="text"
		name="spreadsheet"
		placeholder="Enter URL"
		required
		value="https://docs.google.com/spreadsheets/d/1lAC9Kw9sTuaOcvRHznlWlsMZ2RyenqnBY74fbQyoY9c/edit?gid=0#gid=0"
	/>
	<button type="submit">Create Schedule</button>

	{#if validationMessage}
		<p>{validationMessage}</p>
	{/if}
</form>

{#each days as day}
	<pre>{JSON.stringify(day, null, 2)}</pre>
{/each}
