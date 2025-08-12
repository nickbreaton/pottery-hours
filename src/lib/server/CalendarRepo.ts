import { Effect, DateTime, MutableHashSet, Schema } from 'effect';
import ical from 'ical-generator';
import { ScheduleRepo } from './ScheduleRepo';
import { MonthIndexFromMonth, URLFromSpreadsheetId } from './schema';

// @ts-ignore
import hourConvert from 'hour-convert';

export class CalendarRepo extends Effect.Service<CalendarRepo>()('CalendarRepo', {
	dependencies: [ScheduleRepo.Default],
	effect: Effect.gen(function* () {
		const scheduleRepo = yield* ScheduleRepo;

		const zoneString = 'America/New_York';
		const zone = yield* DateTime.zoneFromString(zoneString);

		const feed = Effect.gen(function* () {
			const schedules = yield* scheduleRepo.list({ published: true });

			const calendar = ical({
				name: 'Pottery Hours',
				timezone: zoneString,
				// TODO: consider using domain name
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

						const event = calendar.createEvent({
							id: `${schedule.id}/${day.iso8601}/${hours.start_hour + hours.start_meridiem}`,
							start: DateTime.formatIsoZoned(start),
							end: DateTime.formatIsoZoned(end),
							created: schedule.createdAt,
							summary: day.label,
							timezone: zoneString,
							attachments: [],
							url: yield* Schema.encode(URLFromSpreadsheetId)(schedule.spreadsheetId)
						});

						// TODO: need to get fully resolved URL of deployment
						event.createAttachment(`http://localhost:5173/file/${schedule.id}.pdf`);
					}
				}
			}

			return calendar.toString();
		});

		return { feed };
	})
}) {}
