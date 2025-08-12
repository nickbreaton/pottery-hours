import dedent from 'dedent';
import { DateTime, Effect, MutableHashSet, Schema } from 'effect';
import hourConvert from 'hour-convert';
import ical from 'ical-generator';
import { ScheduleRepo } from './ScheduleRepo';
import { MonthIndexFromMonth, URLFromSpreadsheetId } from './schema';

export class CalendarRepo extends Effect.Service<CalendarRepo>()('CalendarRepo', {
	dependencies: [ScheduleRepo.Default],
	effect: Effect.gen(function* () {
		const scheduleRepo = yield* ScheduleRepo;

		const zoneString = 'America/New_York';
		const zone = yield* DateTime.zoneFromString(zoneString);

		const feed = Effect.fn('feed')(function* ({ origin }: { origin: string }) {
			const schedules = yield* scheduleRepo.list({ published: true });

			const calendar = ical({
				name: 'Pottery Hours',
				timezone: zoneString,
				prodId: 'https://github.com/nickbreaton/pottery-hours'
			});

			const added = MutableHashSet.make<string[]>();

			for (const schedule of schedules) {
				for (const day of schedule.days) {
					if (MutableHashSet.has(added, day.iso8601)) {
						// Only add once to calendar, some schedules may overlap.
						// Prefers most recently created schedule.
						continue;
					}

					MutableHashSet.add(added, day.iso8601);

					const month = (yield* Schema.encode(MonthIndexFromMonth)(day.month)) + 1;

					const date = yield* DateTime.makeZoned(
						{ year: day.year, month, day: day.day, zone },
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

						calendar.createEvent({
							id: `${schedule.id}/${day.iso8601}/${hours.start_hour + hours.start_meridiem}`,
							start: DateTime.formatIsoZoned(start),
							end: DateTime.formatIsoZoned(end),
							created: schedule.createdAt,
							summary: day.label,
							timezone: zoneString,
							description: dedent`
							  Google Sheet: ${yield* Schema.encode(URLFromSpreadsheetId)(schedule.spreadsheetId)}

								Source document: ${origin}/file/${schedule.id}.pdf
							`,
							// Apple Calendar does not support attachments this, but included for completeness.
							// PDF document is also referenced in the description.
							attachments: [`${origin}/file/${schedule.id}.pdf`]
						});
					}
				}
			}

			return calendar.toString();
		});

		return { feed };
	})
}) {}
