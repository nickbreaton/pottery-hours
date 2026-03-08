<script lang="ts">
	import { replaceState } from '$app/navigation';
	import { deleteSchedule, getSchedule, getSchedules } from '$lib/main.remote';
	import type { EventHandler } from 'svelte/elements';
	import type { CompleteEvent, DayEvent, InvalidEvent } from '../api/new/schema';
	import { WandSparkles } from 'lucide-svelte';
	import Calendar from '$lib/components/Calendar.svelte';
	import { fade } from 'svelte/transition';
	import { sineInOut } from 'svelte/easing';
	import { importer } from '$lib/stores/importer.svelte';
	import MenuControl from '$lib/components/MenuControl.svelte';

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
		<div
			class="text-center flex flex-col items-center gap-8 pt-10 sm:pt-28 p-5 sm:p-3"
			out:fade={{ easing: sineInOut }}
		>
			<div class="flex sm:hidden self-start pb-5 pl-1 -mt-1.5">
				<MenuControl direction="open" />
			</div>

			<hgroup class="flex flex-col items-center justify-stretch gap-4">
				<h1 class="text-4xl font-extrabold text-text-strong">Hey, got a new schedule?</h1>
				<p class="max-w-lg leading-5 text-text-muted decoration-text-soft text-balance">
					I’m a helpful assistant that takes Odyssey Clayworks schedules, like {@render example('this one')}, and turns
					them into a simple calendar feed. Enter a schedule link to get started.
				</p>
			</hgroup>

			<form onsubmit={submit} class="flex flex-col items-center w-full max-w-lg gap-2">
				<textarea
					name="spreadsheet"
					placeholder="https://docs.google.com/spreadsheets/d/..."
					rows="3"
					class="border-[1.5px] bg-surface-card text-text-strong border-border-subtle placeholder-text-soft outline-none rounded-lg resize-none p-2 w-full max-w-lg focus:outline-3 focus:border-focus-border focus:outline-solid focus:outline-focus-ring"
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
	     					relative overflow-hidden bg-linear-to-tl from-accent-start to-accent-end inset-shadow-accent-shadow text-sm text-white font-medium py-2.5 px-7 rounded-md cursor-pointer
	     					disabled:opacity-30 disabled:cursor-default
	     					data-loading:cursor-default
	     					not-data-loading:active:from-accent-start/90 not-data-loading:active:to-accent-end/90"
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
					<!-- TODO: remove when async svelte gets better -->
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
		background-color: var(--color-accent-shadow);
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
