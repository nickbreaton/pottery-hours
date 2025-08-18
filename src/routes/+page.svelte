<script lang="ts">
	import { replaceState } from '$app/navigation';
	import { getSchedule, getSchedules } from '$lib/main.remote';
	import type { ScheduleDay } from '$lib/server/schema';
	import type { EventHandler } from 'svelte/elements';
	import type { CompleteEvent, DayEvent, InvalidEvent } from './api/new/schema';
	import { WandSparkles } from 'lucide-svelte';
	import Calendar from '$lib/components/Calendar.svelte';

	let sse: EventSource | null = $state(null);
	let validationMessage: string | null = $state(null);
	let days: (typeof ScheduleDay.Encoded)[] = $state([]);
	let input = $state('');

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

<div class="text-center flex flex-col items-center gap-8 pt-10 sm:pt-28 p-3">
	<hgroup class="flex flex-col items-center justify-stretch gap-4">
		<h1 class="text-4xl font-extrabold text-zinc-900">Hey, got a new schedule?</h1>
		<p class="max-w-lg leading-5 text-zinc-500 decoration-zinc-400 text-balance">
			I’m a helpful assistant that takes Odyssey Clayworks schedules, like
			<a
				href="https://docs.google.com/spreadsheets/d/1lAC9Kw9sTuaOcvRHznlWlsMZ2RyenqnBY74fbQyoY9c/edit?gid=0#gid=0"
				target="_blank"
				class="underline underline-offset-1">this one</a
			>, and turns them into a simple calendar feed. Enter a schedule link to get started.
		</p>
	</hgroup>

	<form onsubmit={submit} class="flex flex-col items-center w-full max-w-lg gap-2">
		<textarea
			name="spreadsheet"
			placeholder="https://docs.google.com/spreadsheets/d/..."
			rows="3"
			class="border-2 bg-white text-zinc-900 border-zinc-200/75 placeholder-zinc-400/75 outline-none rounded-lg resize-none p-2 w-full max-w-lg focus:outline-3 focus:border-purple-200 focus:outline-solid focus:outline-purple-100"
			bind:value={input}
			onkeydown={(event) => {
				if (event.key === 'Enter') {
					event.preventDefault();
					event.currentTarget.closest('form')?.requestSubmit();
				}
			}}
		></textarea>

		<div class="flex justify-end w-full">
			<button
				type="submit"
				class="bg-linear-to-tl from-purple-500 to-purple-400 bg-black active:from-purple-500/90 active:to-purple-400/90 flex items-center gap-2 inset-shadow-purple-800 text-sm text-white font-medium py-2.5 px-7 rounded-md cursor-pointer disabled:opacity-30 disabled:cursor-default"
				disabled={!input.startsWith('https://docs.google.com/spreadsheets/d/')}
			>
				Analyze schedule <WandSparkles size="1.25em" />
			</button>
		</div>

		{#if validationMessage}
			<p>{validationMessage}</p>
		{/if}
	</form>

	{#if days.length > 0}
		<Calendar {days} followDays={true} />
	{/if}
</div>
