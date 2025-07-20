import { ScheduleStore } from '$lib/server/ScheduleStore';
import { DateTime, Effect, Schema } from 'effect';
import type { RequestHandler } from './$types';
import { runtime } from '$lib/server/runtime';
import ical from 'ical-generator';

import { MonthIndexFromMonth, URLFromSpreadsheetId } from '$lib/schema';

// @ts-ignore
import hourConvert from 'hour-convert';

export const GET: RequestHandler = async ({ url }) => {
	const textOutput = url.searchParams.get('format') === 'text';

	const program = Effect.gen(function* () {
		const scheduleStore = yield* ScheduleStore;
		const schedule = yield* scheduleStore.get;

		const calendar = ical({ name: 'Pottery Hours' });

		for (const sheet in schedule) {
			for (const day of schedule[sheet].days) {
				const date = yield* DateTime.makeZoned(
					{
						year: day.year,
						month: (yield* Schema.encode(MonthIndexFromMonth)(day.month)) + 1,
						day: day.day,
						zone: yield* DateTime.zoneFromString('America/New_York')
					},
					{ adjustForTimeZone: true }
				);

				for (const hours of day.hours) {
					const start = DateTime.setParts(date, {
						hours: hourConvert.to24Hour({
							hour: hours.start_hour,
							meridiem: hours.start_meridiem.toLowerCase()
						}),
						minutes: hours.start_minute
					});

					const end = DateTime.setParts(date, {
						hours: hourConvert.to24Hour({
							hour: hours.end_hour,
							meridiem: hours.end_meridiem.toLowerCase()
						}),
						minutes: hours.end_minute
					});

					const url = yield* Schema.encode(URLFromSpreadsheetId)(sheet);

					calendar.createEvent({
						start: DateTime.toDateUtc(start),
						end: DateTime.toDateUtc(end),
						timezone: 'America/New_York',
						summary: day.label,
						description: {
							plain: `Schedule: ${url}`,
							html: `<a href="${url}">Schedule</a>`
						}
					});
				}
			}
		}

		return new Response(calendar.toString(), {
			headers: textOutput
				? {}
				: {
						'Content-Type': 'text/calendar; charset=utf-8',
						'Content-Disposition': 'attachment; filename="calendar.ics"'
					}
		});
	});

	return program.pipe(Effect.scoped, runtime.runPromise);
};
