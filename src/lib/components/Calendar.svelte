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

	function format8601CalendarDay(date: Iso8601Date, { forceMonthPrefix = false } = {}) {
		const day = parseIso8601Day(date);
		const monthPrefix = MONTHS[parse8601Month(date) - 1].substring(0, 3);
		return day === 1 || forceMonthPrefix ? `${monthPrefix} ${day}` : day;
	}

	function formatCalendarMonthLabel([year, monthIndex]: CalendarMonth, { shortMonth = false } = {}) {
		const month = shortMonth ? MONTHS[monthIndex].substring(0, 3) : MONTHS[monthIndex];
		return `${month} ${year}`;
	}
</script>

<script lang="ts">
	import { type ScheduleDay } from '$lib/server/schema';
	import { getUniqueCalendarMonths, MONTHS, WEEKDAYS, type CalendarMonth } from '$lib/utils/datetime';
	import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BookUp2, Trash2 } from 'lucide-svelte';
	import { fade } from 'svelte/transition';
	import { sineIn, sineInOut } from 'svelte/easing';
	import { page } from '$app/state';

	// @ts-ignore
	import calendar from 'calendar-month-array';
	import Button from './Button.svelte';
	import { deleteSchedule, getSchedule, getSchedules, setSchedulePublished } from '$lib/main.remote';
	import { importer } from '$lib/stores/importer.svelte';
	import { goto } from '$app/navigation';
	import MenuControl from './MenuControl.svelte';

	interface Props {
		days: Readonly<EncodedDay[]>;
		importing?: boolean;
		followDays?: boolean;
		published?: boolean;
		id?: string;
	}

	let { days, importing, followDays, published, id }: Props = $props();

	const calendarMonths = $derived(getUniqueCalendarMonths(days));

	let visibleMonthIndex = $derived.by(() => {
		// Included to reset on page change. This likely could be improved by wrapping the entire component
		// in a key based on the schedule ID, but there seems to be a bug with that and async Svelte.
		page.params?.id;

		return followDays ? calendarMonths.length - 1 : 0;
	});

	const calendarMonth = $derived(calendarMonths[visibleMonthIndex]);
	const monthIndex = $derived(calendarMonth[1]);
	const grid: Iso8601Date[][] = $derived(calendar(new Date(...calendarMonth), { formatDate: toIso8601 }));

	const borderColor = 'border-zinc-200/75';
	const cellBorder = `border first:border-l-0 last:border-r-0 group-first:border-t-0 not-[th]:group-last:border-b-0 ${borderColor}`;

	let mobileSection!: HTMLDivElement;
	let followScroll = $state(followDays);

	$effect(() => {
		if (!mobileSection) return;

		const controller = new AbortController();

		window.addEventListener('wheel', () => (followScroll = false), { passive: true, signal: controller.signal });
		window.addEventListener('click', () => (followScroll = false), { passive: true, signal: controller.signal });
		window.addEventListener('keydown', () => (followScroll = false), { passive: true, signal: controller.signal });

		return () => controller.abort();
	});

	$effect(() => {
		if (mobileSection && importing && followDays && followScroll) {
			document.documentElement.classList.add('no-scrollbar');
		} else {
			document.documentElement.classList.remove('no-scrollbar');
		}
	});
</script>

<div class="p-6 text-left flex flex-col gap-2">
	<div class="flex justify-between xl:grid grid-cols-[1fr_auto_1fr] items-center">
		<div class="hidden xl:flex gap-1.5">
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

		<h1 class="text-xl font-normal flex text-zinc-900">
			<span class="hidden xl:inline">{formatCalendarMonthLabel(calendarMonth)}</span>
			<span class="hidden sm:inline xl:hidden">{formatCalendarMonthLabel(calendarMonths[0])}</span>
			<span class="inline-flex sm:hidden gap-3">
				<MenuControl direction="open" />
				{formatCalendarMonthLabel(calendarMonths[0], { shortMonth: true })}
			</span>
		</h1>

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

	<!-- desktop view -->

	<div class="hidden xl:grid *:col-start-1 *:row-start-1">
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
																	<span class="text-xs overflow-ellipsis overflow-hidden whitespace-nowrap">
																		{formatHour(hour, 'start')} – {formatHour(hour, 'end')}
																	</span>
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

	<!-- mobile view -->

	<div class="grid xl:hidden sm:m-0 gap-y-8" bind:this={mobileSection}>
		{#each calendarMonths as calendarMonth, calendarIndex}
			{@const calendarWeekGrid: (Iso8601Date | null)[][] = calendar(new Date(...calendarMonth), {
  	    formatDate: (date: Date, info: any) => info.siblingMonth  === 1 ? null : toIso8601(date) ,
  		})}

			<section class="grid gap-4">
				{#if calendarIndex > 0}
					<h2 class="col-span-full col-start-1 text-lg" in:fade={{ duration: 150, easing: sineIn }}>
						{formatCalendarMonthLabel(calendarMonth)}
					</h2>
				{/if}

				{#each calendarWeekGrid as calendarWeekDays}
					{@const hasTrailingSiblingCalendarDays = calendarWeekDays.some((calendarDays) => calendarDays == null)}
					{@const hasPlacedDays = calendarWeekDays.some((calendarDays) => {
						return days.find((day) => toIso8601(day) === calendarDays)?.hours?.length;
					})}

					{#if !hasTrailingSiblingCalendarDays && hasPlacedDays}
						<dl
							class="-mx-6 sm:mx-0 px-6 py-4 sm:p-4 grid auto-rows-fr grid-cols-[minmax(max-content,1fr)_2fr] gap-x-6 gap-y-5 bg-white/80 sm:rounded-md {borderColor} border"
						>
							{#each calendarWeekDays as calendarWeekDay, calendarWeekDayIndex}
								{@const day = days.find((day) => toIso8601(day) === calendarWeekDay)}

								<div class="group grid grid-cols-subgrid col-span-full {borderColor} not-last:border-b not-last:pb-4">
									<dt class="flex flex-col">
										<span class="text-sm text-zinc-400">{WEEKDAYS[calendarWeekDayIndex]}</span>
										{#if calendarWeekDay}
											<span class="font-medium">
												{format8601CalendarDay(calendarWeekDay, { forceMonthPrefix: true })}
											</span>
										{/if}
									</dt>
									<dd class="min-h-[7.25rem] scroll-m-8 group-last:scroll-m-4">
										{#if day && day?.hours?.length > 0}
											<!-- TODO: first child not transitioning in -->
											<ul
												class="space-y-2"
												in:fade|global={{ duration: followDays ? 250 : 0, delay: followDays ? 100 : 0, easing: sineIn }}
												{@attach (el) => {
													if (followDays && followScroll) {
														el.parentElement?.scrollIntoView({ block: 'end', behavior: 'smooth' });
													}
												}}
											>
												{#each day.hours as hour}
													<li
														class="bg-purple-100 text-purple-900/90 rounded p-1 px-2 lg:p-2 lg:px-2 flex -space-y-0.5 lg:space-y-0 flex-col border border-purple-900/10"
													>
														<span class="font-medium text-sm">
															{day.label}
														</span>
														<span class="text-xs">
															{formatHour(hour, 'start')} – {formatHour(hour, 'end')}
														</span>
													</li>
												{/each}
											</ul>
										{:else}
											<span class="absolute" out:fade={{ duration: 100, easing: sineIn }}>No hours</span>
										{/if}
									</dd>
								</div>
							{/each}
						</dl>
					{/if}
				{/each}
			</section>
		{/each}

		<div class="col-start-1 col-span-full flex justify-end min-h-10">
			{#if !importing}
				<Button onclick={() => window.scrollTo({ top: 0 })}>
					<span
						class="flex gap-2 items-center"
						{@attach (element) => {
							if (followDays && followScroll) {
								element.scrollIntoView({ behavior: 'smooth' });
							}
						}}
					>
						Back to top <ArrowUp size="1.2em" />
					</span>
				</Button>
			{/if}
		</div>
		{#if importing && followDays && !followScroll}
			<div class="fixed bottom-6 right-8" in:fade={{ duration: 150, easing: sineIn }}>
				<Button
					onclick={(event) => {
						event.stopPropagation();
						followScroll = true;
					}}
				>
					<span class="flex gap-2 items-center">
						Follow import <ArrowDown size="1.2em" />
					</span>
				</Button>
			</div>
		{/if}
	</div>
</div>
