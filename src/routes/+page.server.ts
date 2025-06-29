import { runtime } from '$lib/server/runtime';
import {
	Array,
	Chunk,
	DateTime,
	Effect,
	HashMap,
	MutableHashMap,
	Option,
	Order,
	ParseResult,
	pipe,
	Record,
	Schema,
	Stream,
	String
} from 'effect';
import type { PageServerLoad } from './$types';
import { ScheduleAnalyzer } from '$lib/server/ScheduleAnalyzer';
import { MonthIndexFromMonth, ScheduleDay } from '$lib/schema';

export class DisplayDay extends Schema.Class<DisplayDay>('DisplayDay')({
	label: Schema.String,
	day: Schema.Number,
	hoursLabels: Schema.Array(Schema.String)
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

const DisplaySchedule = Schema.Array(DisplayWeek);

const DisplayScheduleFromScheduleDays = Schema.transformOrFail(
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

					const date = yield* DateTime.makeZoned({
						year: scheduleDay.year,
						month: yield* Schema.encode(MonthIndexFromMonth)(scheduleDay.month),
						day: scheduleDay.day,
						zone: yield* DateTime.zoneFromString('America/New_York')
					});

					const startOfWeek = DateTime.startOf('week')(date);

					const week = HashMap.get(startOfWeek)(weeksByStartOfWeek).pipe(
						Option.getOrElse(() =>
							DisplayWeek.make({
								label: 'Week of ' + DateTime.format(startOfWeek, { month: 'long', day: 'numeric' }),
								days: {}
							})
						)
					);

					const newWeek = DisplayWeek.make({
						...week,
						days: {
							...week.days,
							[DateTime.getPart(date, 'weekDay')]: DisplayDay.make({
								label: scheduleDay.label,
								hoursLabels,
								day: scheduleDay.day
							})
						}
					});

					HashMap.set(startOfWeek, newWeek)(weeksByStartOfWeek);
				}

				// HashMap.endMutation(weeksByStartOfWeek);

				// console.log(HashMap.toEntries(weeksByStartOfWeek)

				return pipe(
					HashMap.toEntries(weeksByStartOfWeek),
					Array.sortWith((entry) => DateTime.toEpochMillis(entry[0]), Order.number),
					Array.map(([_, week]) => week)
				);
			}).pipe(Effect.mapError((error) => new ParseResult.Type(ast, scheduleDays, error.message))),

		encode: () => Effect.dieMessage('Not implemented')
	}
);

export const load: PageServerLoad = async ({ url }) => {
	const program = Effect.gen(function* () {
		// Temporary get days directly from parser (since its mocked),
		// we'll want to fetch this from our store at some point
		const scheduleAnalyzer = yield* ScheduleAnalyzer;
		const schedule = yield* scheduleAnalyzer
			.getSchedule(new Uint8Array())
			.pipe(Stream.runCollect, Effect.map(Chunk.toArray));

		const displaySchedule = yield* Schema.decode(DisplayScheduleFromScheduleDays)(schedule);

		return { weeks: yield* Schema.encode(DisplaySchedule)(displaySchedule) };
	});

	const result = await program.pipe(
		Effect.scoped,
		Effect.withSpan('load', { attributes: { pathname: url.pathname } }),
		runtime.runPromise
	);

	return result;
};
