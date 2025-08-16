<script lang="ts" module>
	type EncodedDay = typeof ScheduleDay.Encoded;

	function toEnigmaDateString(day: EncodedDay) {
		const month = MONTHS.findIndex((it) => it === day.month) + 1;
		return `${String(day.day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${day.year}`;
	}

	function formatHour(hour: EncodedDay['hours'][number], type: 'start' | 'end') {
		return `${hour[`${type}_hour`]}:${String(hour[`${type}_minute`]).padStart(2, '0')}${hour[`${type}_meridiem`].toLowerCase()}`;
	}
</script>

<script lang="ts">
	import CalendarJS from '@enigmaoffline/calendarjs';
	import { type ScheduleDay } from '$lib/server/schema';
	import { MONTHS } from '$lib/utils/datetime';

	let { days }: { days: Readonly<EncodedDay[]> } = $props();
	let activeMonthIndex = $state(0);

	const months = $derived.by(() => {
		const result: [year: number, month: number][] = [];

		for (const day of days) {
			const month = MONTHS.findIndex((it) => it === day.month) + 1;
			const year = day.year;

			if (result.find((existing) => existing[0] === year && existing[1] === month)) {
				// dont add duplicate months
				continue;
			}

			result.push([year, month]);
		}

		return result;
	});

	const month = $derived(months[activeMonthIndex]);

	const monthLabel = $derived(MONTHS[month[1] - 1]);
	const yearLabel = $derived(month[0]);

	const cal = $derived(new CalendarJS(...month));
	const grid = $derived(cal.getGrid());
</script>

<div class="p-6 text-left">
	<div>
		<button
			onclick={() => (activeMonthIndex = Math.max(0, activeMonthIndex - 1))}
			disabled={activeMonthIndex <= 0}
			class="disabled:opacity-35">←</button
		>
		<button
			onclick={() => (activeMonthIndex = Math.min(months.length - 1, activeMonthIndex + 1))}
			disabled={activeMonthIndex >= months.length - 1}
			class="disabled:opacity-35">→</button
		>
	</div>

	<h1>{monthLabel} {yearLabel}</h1>

	<table class="table-fixed w-full border-zinc-200/75">
		<thead>
			<tr>
				<th>Sunday</th>
				<th>Monday</th>
				<th>Tuesday</th>
				<th>Wednesday</th>
				<th>Thursday</th>
				<th>Friday</th>
				<th>Saturday</th>
			</tr>
		</thead>
		<tbody class="border-inherit">
			{#each grid as row, index (`${row[0]}-${index}`)}
				<tr class="border-inherit">
					{#each row as date}
						{@const day = days.find((day) => date === toEnigmaDateString(day))}
						<td class="align-top h-32 border border-inherit p-1.5 cursor-default">
							{#if day}
								<ul class="space-y-1.5">
									{#each day.hours as hour}
										<li
											class="bg-purple-100 text-purple-900/90 rounded-md p-1 px-2 flex -space-y-0.5 flex-col border border-purple-900/10"
										>
											<span class="font-medium text-sm overflow-ellipsis overflow-hidden whitespace-nowrap">
												{day.label}
											</span>
											<span class="text-xs"> {formatHour(hour, 'start')} – {formatHour(hour, 'end')}</span>
										</li>
									{/each}
								</ul>
							{:else}
								<span>-</span>
							{/if}
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>
