<script lang="ts">
	import { replaceState } from '$app/navigation';
	import { deleteSchedule, getSchedule, getSchedules } from '$lib/main.remote';
	import type { EventHandler } from 'svelte/elements';
	import type { CompleteEvent, DayEvent, InvalidEvent } from './api/new/schema';
	import { WandSparkles } from 'lucide-svelte';
	import Calendar from '$lib/components/Calendar.svelte';
	import { fade } from 'svelte/transition';
	import { sineInOut } from 'svelte/easing';
	import { importer } from '$lib/stores/importer.svelte';

	const disabled = $derived(!importer.input.startsWith('https://docs.google.com/spreadsheets/d/'));

	$effect(() => {
		if (!importer.connection) return;

		importer.connection.addEventListener('day', (event) => {
			const data: typeof DayEvent.Encoded = JSON.parse(event.data);
			importer.days.push(data.data);
		});

		importer.connection.addEventListener('invalid', (event) => {
			const data: typeof InvalidEvent.Encoded = JSON.parse(event.data);

			importer.validationMessage = data.message;
			importer.connection?.close();
			importer.connection = null;
		});

		importer.connection.addEventListener('complete', async (event) => {
			const data: typeof CompleteEvent.Encoded = JSON.parse(event.data);

			importer.connection?.close();
			importer.connection = null;
			importer.importedId = data.id;
			await Promise.all([getSchedule(data.id).refresh(), getSchedules().refresh()]);

			replaceState(`/schedule/${data.id}`, {});
		});

		return () => {
			importer.connection?.close();
			importer.connection = null;
		};
	});

	const submit: EventHandler<SubmitEvent, HTMLFormElement> = (event) => {
		event.preventDefault();

		if (importer.connection || disabled) {
			return;
		}

		const formData = new FormData(event.currentTarget);
		const searchParams = new URLSearchParams(formData as {});
		importer.connection = new EventSource(`/api/new?${searchParams}`);
	};
</script>

<div class="grid *:col-start-1 *:row-start-1">
	{#if importer.days.length === 0}
		<div class="text-center flex flex-col items-center gap-8 pt-10 sm:pt-28 p-3" out:fade={{ easing: sineInOut }}>
			<hgroup class="flex flex-col items-center justify-stretch gap-4">
				<h1 class="text-4xl font-extrabold text-zinc-900">Hey, got a new schedule?</h1>
				<p class="max-w-lg leading-5 text-zinc-500 decoration-zinc-400 text-balance">
					I’m a helpful assistant that takes Odyssey Clayworks schedules, like {@render example('this one')}, and turns
					them into a simple calendar feed. Enter a schedule link to get started.
				</p>
			</hgroup>

			<form onsubmit={submit} class="flex flex-col items-center w-full max-w-lg gap-2">
				<textarea
					name="spreadsheet"
					placeholder="https://docs.google.com/spreadsheets/d/..."
					rows="3"
					class="border-[1.5px] bg-white text-zinc-900 border-zinc-200/75 placeholder-zinc-400/75 outline-none rounded-lg resize-none p-2 w-full max-w-lg focus:outline-3 focus:border-purple-200 focus:outline-solid focus:outline-purple-100"
					bind:value={importer.input}
					onkeydown={(event) => {
						if (event.key === 'Enter') {
							event.preventDefault();
							event.currentTarget.form?.requestSubmit();
						}
					}}
				></textarea>

				<div class="flex justify-end w-full">
					<button
						type="submit"
						class="
     					relative overflow-hidden bg-linear-to-tl from-purple-600 to-purple-400 bg-black inset-shadow-purple-800 text-sm text-white font-medium py-2.5 px-7 rounded-md cursor-pointer
     					disabled:opacity-30 disabled:cursor-default
     					data-loading:cursor-default
     					not-data-loading:active:from-purple-600/90 not-data-loading:active:to-purple-400/90"
						aria-label={importer.connection ? 'Loading' : null}
						data-loading={importer.connection ? '' : null}
						{disabled}
					>
						<span class="flex items-center gap-2 relative">Analyze schedule <WandSparkles size="1.25em" /></span>
					</button>
				</div>

				{#if importer.validationMessage}
					<p>{importer.validationMessage}</p>
				{/if}
			</form>
		</div>
	{:else}
		<div in:fade={{ delay: 200, easing: sineInOut }}>
			<svelte:boundary>
				{#snippet pending()}
					<!-- ignore -->
				{/snippet}

				{@const schedule = importer.importedId ? await getSchedule(importer.importedId) : null}
				{@const published = schedule?.published ?? false}

				<Calendar
					followDays
					days={importer.days}
					importing={importer.importing}
					id={importer.importedId ?? undefined}
					{published}
				/>
			</svelte:boundary>
		</div>
	{/if}
</div>

{#snippet example(text: string)}
	<a
		href="https://docs.google.com/spreadsheets/d/1TzskQzL15VNhNmFMki_fvmKe5aXO_PlU2894VoHoYLc/edit?gid=0#gid=0"
		target="_blank"
		class="underline underline-offset-1"
	>
		{text}
	</a>
{/snippet}

<style>
	button[data-loading]::before {
		content: '';
		position: absolute;
		inset: 0;
		background-color: var(--color-purple-900);
		opacity: 0.33;
		right: 100%;
		animation: grow 20s cubic-bezier(0.19, 1, 0.22, 1) forwards;
		will-change: right;
	}

	@keyframes grow {
		0% {
			right: 100%;
		}
		100% {
			right: 0%;
		}
	}
</style>
