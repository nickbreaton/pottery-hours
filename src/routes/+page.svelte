<script lang="ts">
	import { runtime } from '$lib/client/runtime';
	import Logo from '$lib/components/Logo.svelte';
	import { ScheduleDay } from '$lib/schema';
	import { HttpBody, HttpClient } from '@effect/platform';
	import { Console, Effect, Schema, Stream, Chunk } from 'effect';
	import { type DisplayDay, type DisplayWeek } from './+page.server';

	const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

	let { data } = $props();
	let { weeks } = $derived(data);

	const asArray = (days: DisplayWeek['days']) => {
		const result: (DisplayDay | undefined)[] = Array.from({ length: 7 });
		for (const idx in days) {
			const index = parseInt(idx);
			result[index] = (days as any)?.[index as any];
		}
		console.log({ result });
		return result;
	};

	// $inspect(weeks);
</script>

<!-- <p class="text-foreground underline">test</p> -->

<!-- <div class="size-20 rounded-md border border-border bg-card"></div> -->

<div class="flex gap-4 flex-col sm:flex-row">
	<!-- weeks -->
	<main class="grow space-y-3">
		{#each weeks as week}
			<div
				class="bg-gray-50 border-[1.5px] border-gray-200 rounded-lg p-4 space-y-3 tracking-tight"
			>
				<p class="text-2xl font-semibold">{week.label}</p>
				<div class="grid grid-cols-[max-content_1fr] gap-y-3 gap-x-6">
					{#each asArray(week.days) as day, index}
						{#if day}
							<p class="flex flex-col">
								<span class="text-lg font-semibold tracking-wider">{day.day}</span>
								<span class="text-xs tracking-wide text-gray-500">{dayNames[index]}</span>
							</p>
							<div class="flex flex-col gap-0.5 justify-between">
								<span class="text-lg text-grap-800">{day.label}</span>
								<div class="flex gap-1.5">
									{#each day.hoursLabels as hoursLabel}
										<span
											class="text-xs py-1 px-3 rounded bg-gray-200 text-gray-500 tracking-wider"
										>
											{hoursLabel}
										</span>
									{/each}
								</div>
							</div>
						{:else}
							<!-- TODO: preseve day on server so that we can render the correct date -->
							<span />
							<span>Nothing scheduled</span>
						{/if}
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
			<div class="bg-gray-50 border-[1.5px] basis-56 border-gray-200 rounded-lg p-4 min-w-64">
				July 2025
			</div>

			<div
				class="h-11 bg-accent active:bg-accent-600 rounded-lg text-white font-medium grid place-items-center cursor-pointer touch-manipulation select-none inset-shadow-sm"
			>
				Subscribe to calendar
			</div>
		</aside>
	</div>
</div>
