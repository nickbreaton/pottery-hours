import { runtime } from '$lib/server/runtime';
import { Array, Chunk, Effect, Option, Order, pipe, Record, Schema, Stream } from 'effect';
import type { PageServerLoad } from './$types';
import { ScheduleAnalyzer } from '$lib/server/ScheduleAnalyzer';
import { DisplaySchedule, DisplayScheduleFromScheduleDays } from '$lib/schema/display';
import { ScheduleStore } from '$lib/server/ScheduleStore';
import { Month, MonthIndexFromMonth, ScheduleDay, URLFromSpreadsheetId } from '$lib/schema';

export const load: PageServerLoad = async ({ url }) => {
	const program = Effect.gen(function* () {
		const scheduleStore = yield* ScheduleStore;

		const schedules = yield* scheduleStore.get;

		const scheduleList = yield* pipe(
			schedules,
			Record.toEntries,
			Effect.forEach(
				Effect.fn(function* ([id, schedule]) {
					const url = yield* Schema.encode(URLFromSpreadsheetId)(id);

					const order = Order.struct({
						year: Order.number,
						month: Order.mapInput(Schema.encodeSync(MonthIndexFromMonth))(Order.number),
						day: Order.number
					});

					const labelStart = pipe(
						schedule.days,
						Array.min(order),
						({ month, year }) => `${month} ${year}`
					);

					const labelEnd = pipe(
						schedule.days,
						Array.max(order),
						({ month, year }) => `${month} ${year}`
					);

					const label = `${labelStart} - ${labelEnd}`;

					return { id, url, label };
				})
			)
		);

		const days = pipe(
			schedules,
			Record.findFirst(() => true), // TODO: get or selected current schedule
			Option.map(([key, value]) => value.days),
			Option.getOrElse((): readonly ScheduleDay[] => [])
		);

		const weeks = yield* Schema.decode(DisplayScheduleFromScheduleDays)(days).pipe(
			Effect.andThen(Schema.encode(DisplaySchedule))
		);

		return {
			weeks,
			schedules: scheduleList,
			currentId: Object.keys(schedules)[0], // TODO: get current or selceted schedule
			activeId: Object.keys(schedules)[0] // TODO: get current or selceted schedule
		};
	});

	const result = await program.pipe(
		Effect.scoped,
		Effect.withSpan('load', { attributes: { pathname: url.pathname } }),
		runtime.runPromise
	);

	return result;
};
