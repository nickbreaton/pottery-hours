import { Array, DateTime, Effect, HashMap, Option, Order, ParseResult, pipe, Schema } from 'effect';
import { MonthIndexFromMonth, ScheduleDay } from '.';

// Types

export class DisplayDay extends Schema.Class<DisplayDay>('DisplayDay')({
	day: Schema.Number,
	data: Schema.optional(
		Schema.Struct({
			label: Schema.String,
			hoursLabels: Schema.Array(Schema.String)
		})
	)
}) {}

export class DisplayWeek extends Schema.Class<DisplayWeek>('DisplayWeek')({
	label: Schema.String,
	days: Schema.Struct({
		0: Schema.optional(DisplayDay), // Sun - Sat
		1: Schema.optional(DisplayDay),
		2: Schema.optional(DisplayDay),
		3: Schema.optional(DisplayDay),
		4: Schema.optional(DisplayDay),
		5: Schema.optional(DisplayDay),
		6: Schema.optional(DisplayDay)
	})
}) {}

export const DisplaySchedule = Schema.Array(DisplayWeek);
export type DisplaySchedule = typeof DisplaySchedule.Type;

// Transforms

export const DisplayScheduleFromScheduleDays = Schema.transformOrFail(
	Schema.Array(ScheduleDay),
	DisplaySchedule,
	{
		strict: true,
		decode: (scheduleDays, _, ast) =>
			Effect.gen(function* () {
				const weeksByStartOfWeek = HashMap.beginMutation(
					HashMap.empty<DateTime.Zoned, DisplayWeek>()
				);

				for (const scheduleDay of scheduleDays) {
					const hoursLabels = scheduleDay.hours.map((hour) => {
						const start = [hour.start_hour, hour.start_minute].filter((num) => num > 0).join(':');
						const end = [hour.end_hour, hour.end_minute].filter((num) => num > 0).join(':');
						return `${start}${hour.start_meridiem.toLowerCase()} – ${end}${hour.end_meridiem.toLowerCase()}`;
					});

					const date = yield* DateTime.makeZoned(
						{
							year: scheduleDay.year,
							month: (yield* Schema.encode(MonthIndexFromMonth)(scheduleDay.month)) + 1,
							day: scheduleDay.day,
							zone: yield* DateTime.zoneFromString('America/New_York')
						},
						{ adjustForTimeZone: true }
					);

					const startOfWeek = DateTime.startOf('week')(date);

					const makeDefaultDisplayDateFor = (dayOfWeek: number) =>
						DisplayDay.make({
							day: DateTime.add(startOfWeek, { days: dayOfWeek }).pipe(DateTime.getPart('day'))
						});

					const week = HashMap.get(startOfWeek)(weeksByStartOfWeek).pipe(
						Option.getOrElse(() =>
							DisplayWeek.make({
								label: 'Week of ' + DateTime.format(startOfWeek, { month: 'long', day: 'numeric' }),
								days: {
									0: makeDefaultDisplayDateFor(0),
									1: makeDefaultDisplayDateFor(1),
									2: makeDefaultDisplayDateFor(2),
									3: makeDefaultDisplayDateFor(3),
									4: makeDefaultDisplayDateFor(4),
									5: makeDefaultDisplayDateFor(5),
									6: makeDefaultDisplayDateFor(6)
								}
							})
						)
					);

					const newWeek = DisplayWeek.make({
						...week,
						days: {
							...week.days,
							[DateTime.getPart(date, 'weekDay')]: DisplayDay.make({
								day: scheduleDay.day,
								data: {
									label: scheduleDay.label,
									hoursLabels
								}
							})
						}
					});

					HashMap.set(startOfWeek, newWeek)(weeksByStartOfWeek);
				}

				return pipe(
					HashMap.toEntries(weeksByStartOfWeek),
					Array.sortWith((entry) => DateTime.toEpochMillis(entry[0]), Order.number),
					Array.map(([_, week]) => week)
				);
			}).pipe(Effect.mapError((error) => new ParseResult.Type(ast, scheduleDays, error.message))),

		encode: () => Effect.dieMessage('Not implemented')
	}
);
