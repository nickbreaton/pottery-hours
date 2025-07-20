<script lang="ts">
	import ConfigurationModal from '$lib/components/ConfigurationModal.svelte';
	import { type DisplayDay, type DisplayWeek } from '$lib/schema/display';
	import { CalendarCog } from 'lucide-svelte';

	const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

	let { data } = $props();
	let { weeks, schedules, currentId, activeId } = $derived(data);

	// TODO: clean this up
	const asArray = (days: DisplayWeek['days']) => {
		const result: DisplayDay[] = Array.from({ length: 7 });
		for (const idx in days) {
			const index = parseInt(idx);
			result[index] = (days as any)?.[index as any];
		}
		return result;
	};
</script>

<div class="flex gap-4 flex-col sm:flex-row">
	<!-- weeks -->
	<main class="grow space-y-4">
		{#if weeks.length === 0}
			<div
				class="bg-gray-50 border-[1.5px] border-gray-200 rounded-lg p-5 grid place-items-center min-h-96 text-2xl font-semibold"
			>
				<div class="text-center space-y-2">
					<h2>No current schedule</h2>
					<p class="text-gray-400 font-light text-base text-balance leading-tight">
						There are no sessions available right now. You can still subscribe to the calendar which
						will be updated with future sessions automatically.
					</p>
				</div>
			</div>
		{/if}
		{#each weeks as week}
			<div class="bg-gray-50 border-[1.5px] border-gray-200 rounded-lg p-4 space-y-3">
				<p class="text-2xl font-semibold">{week.label}</p>
				<div class="grid grid-cols-[max-content_1fr] gap-y-3 gap-x-6">
					{#each asArray(week.days) as day, index}
						<p class="flex flex-col">
							<span class="text-lg font-semibold tracking-wider">{day.day}</span>
							<span class="text-xs tracking-wide text-gray-500">{dayNames[index]}</span>
						</p>
						<div class="flex flex-col gap-0.5 justify-between">
							{#if day.data}
								<span class="text-lg text-grap-800">{day.data.label}</span>
								<div class="flex gap-1.5">
									{#each day.data.hoursLabels as hoursLabel}
										<span
											class="text-xs py-1 px-3 rounded bg-gray-200 text-gray-500 tracking-wider"
										>
											{hoursLabel}
										</span>
									{/each}
								</div>
							{:else}
								<span>Nothing scheduled</span>
							{/if}
						</div>
						<hr class="border-gray-200 col-span-2 last:hidden" />
					{/each}
				</div>
			</div>
		{/each}
	</main>

	<!-- sidebar -->
	<div class="relative">
		<aside class="flex flex-col gap-3 sm:sticky sm:top-3">
			<!-- Calendar -->
			<article
				class="bg-gray-50 border-[1.5px] basis-56 border-gray-200 p-4 min-w-64 space-y-2 rounded-lg"
			>
				<h2 class="font-medium">Schedules</h2>

				{#if schedules.length === 0}
					<p class="text-gray-500 text-sm font-light leading-tight">
						No current or future schedules available.
					</p>
				{/if}

				{#each schedules as schedule}
					<ol class="space-y-1">
						<li class="text-sm font-light leading-tight flex items-center gap-2">
							<a
								href={schedule.id === currentId ? '/' : `/schedule/${schedule.id}`}
								class="hover:underline">{schedule.label}</a
							>
							{#if schedule.id === activeId}
								<span
									role="img"
									aria-label="Current schedule"
									class="bg-accent rounded-full size-2 inline-block"
								></span>
							{/if}
						</li>
					</ol>
				{/each}
			</article>

			<div class="flex flex-col gap-1.5">
				<button
					class="h-11 bg-accent active:bg-accent-600 rounded-lg text-white font-medium flex items-center justify-center gap-2 cursor-pointer touch-manipulation select-none"
				>
					Subscribe to all schedules
				</button>

				<ConfigurationModal {schedules}>
					{#snippet children({ open })}
						<button
							class="h-11 bg-gray-400/33 active:bg-gray-400/55 rounded-lg text-gray-600 font-medium flex items-center justify-center gap-2 cursor-pointer touch-manipulation select-none"
							onclick={open}
						>
							Configure schedules <CalendarCog size={20} strokeWidth={2} />
						</button>
					{/snippet}
				</ConfigurationModal>
			</div>
		</aside>
	</div>
</div>
