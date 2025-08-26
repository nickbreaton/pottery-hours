<script lang="ts" module>
	type EncodedDay = typeof ScheduleDay.Encoded;
	type Iso8601Date = `${number}${number}${number}${number}-${number}${number}-${number}${number}`;

	function toIso8601(value: Date | EncodedDay) {
		if (value instanceof Date) {
			return value.toISOString().split('T')[0];
		} else {
			const month = MONTHS.findIndex((it) => it === value.month) + 1;
			return `${value.year}-${String(month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`;
		}
	}

	function formatHour(hour: EncodedDay['hours'][number], type: 'start' | 'end') {
		return `${hour[`${type}_hour`]}:${String(hour[`${type}_minute`]).padStart(2, '0')}${hour[`${type}_meridiem`].toLowerCase()}`;
	}

	function parseIso8601Day(date: Iso8601Date) {
		return parseInt(date.split('-')[2]);
	}

	function parse8601Month(date: Iso8601Date) {
		return parseInt(date.split('-')[1]);
	}

	function format8601CalendarDay(date: Iso8601Date) {
		const day = parseIso8601Day(date);
		const monthPrefix = MONTHS[parse8601Month(date) - 1].substring(0, 3);
		return day === 1 ? `${monthPrefix} ${day}` : day;
	}
</script>

<script lang="ts">
	import { type ScheduleDay } from '$lib/server/schema';
	import { getUniqueCalendarMonths, MONTHS } from '$lib/utils/datetime';
	import { ArrowLeft, ArrowRight, BookUp2, Trash2 } from 'lucide-svelte';
	import { fade } from 'svelte/transition';
	import { sineIn, sineInOut } from 'svelte/easing';

	// @ts-ignore
	import calendar from 'calendar-month-array';
	import Button from './Button.svelte';
	import { deleteSchedule, getSchedule, getSchedules, setSchedulePublished } from '$lib/main.remote';
	import { importer } from '$lib/stores/importer.svelte';
	import { goto } from '$app/navigation';

	interface Props {
		days: Readonly<EncodedDay[]>;
		importing?: boolean;
		followDays?: boolean;
		published?: boolean;
		id?: string;
	}

	let { days, importing, followDays, published, id }: Props = $props();

	const calendarMonths = $derived(getUniqueCalendarMonths(days));

	let visibleMonthIndex = $derived(followDays ? calendarMonths.length - 1 : 0);

	const calendarMonth = $derived(calendarMonths[visibleMonthIndex]);
	const monthIndex = $derived(calendarMonth[1]);

	const monthLabel = $derived(MONTHS[monthIndex]);
	const yearLabel = $derived(calendarMonth[0]);

	const grid: Iso8601Date[][] = $derived(calendar(new Date(...calendarMonth), { formatDate: toIso8601 }));

	const borderColor = 'border-zinc-200/75';
	const cellBorder = `border first:border-l-0 last:border-r-0 group-first:border-t-0 not-[th]:group-last:border-b-0 ${borderColor}`;
</script>

<div class="p-6 text-left flex flex-col gap-2">
	<div class="grid grid-cols-[1fr_auto_1fr] items-center">
		<div class="flex gap-1.5">
			<Button
				disabled={visibleMonthIndex <= 0}
				title="Previous month"
				icon
				onclick={() => {
					followDays = false;
					visibleMonthIndex = Math.max(0, visibleMonthIndex - 1);
				}}
			>
				<ArrowLeft size="1.25rem" />
			</Button>
			<Button
				disabled={visibleMonthIndex >= calendarMonths.length - 1}
				title="Next month"
				icon
				onclick={() => {
					followDays = false;
					visibleMonthIndex = Math.min(calendarMonths.length - 1, visibleMonthIndex + 1);
				}}
			>
				<ArrowRight size="1.25rem" />
			</Button>
		</div>

		<p class="text-xl font-normal flex text-zinc-900">{monthLabel} {yearLabel}</p>

		<div class="flex justify-end gap-1.5">
			<Button
				disabled={importing}
				onclick={async () => {
					if (!id) return;
					if (!confirm('Are you sure you want to delete this schedule?')) return;
					importer.reset();
					await deleteSchedule(id);
					goto('/');
				}}
			>
				Delete
			</Button>
			<Button
				disabled={importing}
				onclick={async () => {
					if (!id) return;

					const next = !published;

					const overrides = [
						getSchedule(id).withOverride((existing) => {
							return { ...existing, published: next };
						}),
						getSchedules().withOverride((schedules) => {
							return schedules.map((schedule) => (schedule.id === id ? { ...schedule, published: next } : schedule));
						})
					];

					await setSchedulePublished({ id, published: next }).updates(...overrides);
				}}
			>
				{published ? 'Unpublish' : 'Publish'}
			</Button>
		</div>
	</div>

	<div class="grid *:col-start-1 *:row-start-1">
		{#each calendarMonths as calendarMonth, calendarIndex (calendarMonth.join(' '))}
			{#if calendarIndex === visibleMonthIndex}
				<div
					class="border {borderColor} rounded-md overflow-hidden"
					transition:fade={{ easing: sineInOut, duration: importing ? undefined : 0 }}
				>
					<table class="table-fixed w-full">
						<thead>
							<tr class="group">
								<th class="bg-zinc-100 text-center text-sm font-semibold px-2 py-1.5 {cellBorder}">Sunday</th>
								<th class="bg-zinc-100 text-center text-sm font-semibold px-2 py-1.5 {cellBorder}">Monday</th>
								<th class="bg-zinc-100 text-center text-sm font-semibold px-2 py-1.5 {cellBorder}">Tuesday</th>
								<th class="bg-zinc-100 text-center text-sm font-semibold px-2 py-1.5 {cellBorder}">Wednesday</th>
								<th class="bg-zinc-100 text-center text-sm font-semibold px-2 py-1.5 {cellBorder}">Thursday</th>
								<th class="bg-zinc-100 text-center text-sm font-semibold px-2 py-1.5 {cellBorder}">Friday</th>
								<th class="bg-zinc-100 text-center text-sm font-semibold px-2 py-1.5 {cellBorder}">Saturday</th>
							</tr>
						</thead>
						<tbody>
							{#each grid as row (row[0])}
								<tr class="group">
									{#each row as date}
										{@const day = days.find((day) => date === toIso8601(day))}
										<td
											data-inactive={monthIndex !== parse8601Month(date) - 1 ? 'true' : null}
											class="align-top h-32 p-2 cursor-default bg-white/80 {cellBorder}"
										>
											<div class="flex flex-col gap-1">
												<span class="text-end text-zinc-800 in-data-inactive:text-zinc-400">
													{format8601CalendarDay(date)}
												</span>
												<div class="min-h-[6rem]">
													{#if day}
														<ul class="space-y-1.5" in:fade={{ duration: 150, easing: sineIn }}>
															{#each day.hours as hour}
																<li
																	class="bg-purple-100 text-purple-900/90 rounded p-1 px-2 flex -space-y-0.5 flex-col border border-purple-900/10 in-data-inactive:opacity-50"
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
											</div>
										</td>
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		{/each}
	</div>
</div>
