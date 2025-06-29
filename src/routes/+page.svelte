<script lang="ts">
	import { runtime } from '$lib/client/runtime';
	import Logo from '$lib/components/Logo.svelte';
	import { ScheduleDay } from '$lib/schema';
	import { HttpBody, HttpClient } from '@effect/platform';
	import { Console, Effect, Schema, Stream, Chunk } from 'effect';

	const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

	const weeks = [
		{
			title: 'This week',
			days: [1, 2, 3, 4, 5, 6, 7]
		},
		{
			title: 'Next week',
			days: [8, 9, 10, 11, 12, 13, 14]
		},
		{
			title: 'Week of July 15',
			days: [15, 16, 17, 18, 19, 20, 21]
		}
	];
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
				<p class="text-2xl font-semibold">{week.title}</p>
				<div class="grid grid-cols-[max-content_1fr] gap-y-3 gap-x-6">
					{#each week.days as day, index}
						<p class="flex flex-col">
							<span class="text-lg font-semibold tracking-wider">{day}</span>
							<span class="text-xs tracking-wide text-gray-500">{dayNames[index]}</span>
						</p>
						<div class="flex flex-col gap-0.5 justify-between">
							<span class="text-lg text-grap-800">Open Studio</span>
							<div class="flex gap-1.5">
								<span class="text-xs py-1 px-3 rounded bg-gray-200 text-gray-500 tracking-wider"
									>10am – 12:30pm</span
								>
								<span class="text-xs py-1 px-3 rounded bg-gray-200 text-gray-500 tracking-wider"
									>2pm – 4:30pm</span
								>
							</div>
						</div>
						<hr class="border-gray-200 col-span-2 last:hidden" />
					{/each}
				</div>
			</div>
		{/each}
	</main>

	<!-- sidebar -->
	<aside class="flex flex-col gap-3">
		<!-- Calendar -->
		<div class="bg-gray-50 border-[1.5px] basis-56 border-gray-200 rounded-lg p-4 min-w-64">
			July 2025
		</div>

		<div
			class="h-11 bg-accent active:bg-accent-600 rounded-lg text-white font-medium grid place-items-center cursor-pointer touch-manipulation select-none inset-shadow-sm"
		>
			Add to Calendar
		</div>
	</aside>
</div>
