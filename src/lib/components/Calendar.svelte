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

<table>
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
	<tbody>
		{#each grid as row, index (`${row[0]}-${index}`)}
			<tr>
				{#each row as date}
					{@const day = days.find((day) => date === toEnigmaDateString(day))}
					<td class="p-2">
						{#if day}
							{#each day.hours as hour}
								<div>{formatHour(hour, 'start')} – {formatHour(hour, 'end')}</div>
							{/each}
						{:else}
							<span>-</span>
						{/if}
					</td>
				{/each}
			</tr>
		{/each}
	</tbody>
</table>
