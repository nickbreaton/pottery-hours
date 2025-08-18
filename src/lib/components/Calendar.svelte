<script lang="ts" module>
	type EncodedDay = typeof ScheduleDay.Encoded;

	function toEnigmaDateString(day: EncodedDay) {
		const month = MONTHS.findIndex((it) => it === day.month) + 1;
		return `${String(day.day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${day.year}`;
	}

	function formatHour(hour: EncodedDay['hours'][number], type: 'start' | 'end') {
		return `${hour[`${type}_hour`]}:${String(hour[`${type}_minute`]).padStart(2, '0')}${hour[`${type}_meridiem`].toLowerCase()}`;
	}

	function parseEnigmaDay(date: string) {
		return parseInt(date.split('-')[0]);
	}

	function parseEnigmaMonth(date: string) {
		return parseInt(date.split('-')[1]);
	}

	function formatEnigmaCalendarDay(date: string) {
		const day = parseEnigmaDay(date);
		const monthPrefix = MONTHS[parseEnigmaMonth(date) - 1].substring(0, 3);
		return day === 1 ? `${monthPrefix} ${day}` : day;
	}
</script>

<script lang="ts">
	import EnigmaCalendar from '@enigmaoffline/calendarjs';
	import { type ScheduleDay } from '$lib/server/schema';
	import { MONTHS } from '$lib/utils/datetime';
	import { ArrowLeft, ArrowRight } from 'lucide-svelte';

	interface Props {
		days: Readonly<EncodedDay[]>;
		followDays?: boolean;
	}

	let { days, followDays }: Props = $props();

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

	let visibleMonthIndex = $derived(followDays ? months.length - 1 : 0);

	const month = $derived(months[visibleMonthIndex]);
	const monthIndex = $derived(month[1] - 1);

	const monthLabel = $derived(MONTHS[monthIndex]);
	const yearLabel = $derived(month[0]);

	const cal = $derived(new EnigmaCalendar(...month));
	const grid = $derived(cal.getGrid());
</script>

<div class="p-6 text-left flex flex-col gap-2">
	<div class="grid grid-cols-[1fr_auto_1fr] items-center">
		<div class="flex gap-1.5">
			<button
				disabled={visibleMonthIndex <= 0}
				title="Previous month"
				class="size-10 grid place-items-center border border-zinc-200 text-zinc-500 bg-zinc-100 rounded cursor-pointer disabled:bg-transparent disabled:text-zinc-300 disabled:cursor-default"
				onclick={() => {
					followDays = false;
					visibleMonthIndex = Math.max(0, visibleMonthIndex - 1);
				}}
			>
				<ArrowLeft size="1.25rem" />
			</button>
			<button
				disabled={visibleMonthIndex >= months.length - 1}
				title="Next month"
				class="size-10 grid place-items-center border border-zinc-200 text-zinc-500 bg-zinc-100 rounded cursor-pointer disabled:bg-transparent disabled:text-zinc-300 disabled:cursor-default"
				onclick={() => {
					followDays = false;
					visibleMonthIndex = Math.min(months.length - 1, visibleMonthIndex + 1);
				}}
			>
				<ArrowRight size="1.25rem" />
			</button>
		</div>

		<p class="text-2xl font-extrabold flex">{monthLabel} {yearLabel}</p>
	</div>

	<table class="table-fixed w-full">
		<thead>
			<tr>
				<th class="bg-zinc-100 text-center text-sm font-semibold px-2 py-1.5 border border-zinc-200/75">Sunday</th>
				<th class="bg-zinc-100 text-center text-sm font-semibold px-2 py-1.5 border border-zinc-200/75">Monday</th>
				<th class="bg-zinc-100 text-center text-sm font-semibold px-2 py-1.5 border border-zinc-200/75">Tuesday</th>
				<th class="bg-zinc-100 text-center text-sm font-semibold px-2 py-1.5 border border-zinc-200/75">Wednesday</th>
				<th class="bg-zinc-100 text-center text-sm font-semibold px-2 py-1.5 border border-zinc-200/75">Thursday</th>
				<th class="bg-zinc-100 text-center text-sm font-semibold px-2 py-1.5 border border-zinc-200/75">Friday</th>
				<th class="bg-zinc-100 text-center text-sm font-semibold px-2 py-1.5 border border-zinc-200/75">Saturday</th>
			</tr>
		</thead>
		<tbody>
			{#each grid as row, index (`${row[0]}-${index}`)}
				<tr>
					{#each row as date}
						{@const day = days.find((day) => date === toEnigmaDateString(day))}
						<td
							data-inactive={monthIndex !== parseEnigmaMonth(date) - 1 ? 'true' : null}
							class="align-top h-32 border border-zinc-200/75 p-2 cursor-default"
						>
							<div class="flex flex-col gap-1">
								<span class="text-end text-zinc-800 in-data-inactive:text-zinc-400">
									{formatEnigmaCalendarDay(date)}
								</span>
								{#if day}
									<ul class="space-y-1.5 pb-2">
										{#each day.hours as hour}
											<li
												class="bg-purple-100 text-purple-900/90 rounded-md p-1 px-2 flex -space-y-0.5 flex-col border border-purple-900/10 in-data-inactive:opacity-50"
												title={day.label}
											>
												<span class="font-medium text-sm overflow-ellipsis overflow-hidden whitespace-nowrap">
													{day.label}
												</span>
												<span class="text-xs">{formatHour(hour, 'start')} – {formatHour(hour, 'end')}</span>
											</li>
										{/each}
									</ul>
								{/if}
							</div>
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>
