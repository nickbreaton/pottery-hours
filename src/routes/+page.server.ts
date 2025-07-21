import { runtime } from '$lib/server/runtime';
import { Array, Chunk, Effect, Option, Order, pipe, Record, Schema, Stream } from 'effect';
import type { PageServerLoad } from './$types';
import { ScheduleAnalyzer } from '$lib/server/ScheduleAnalyzer';
import { DisplaySchedule, DisplayScheduleFromScheduleDays } from '$lib/schema/display';
import { ScheduleStore } from '$lib/server/ScheduleStore';
import { Month, MonthIndexFromMonth, ScheduleDay, URLFromSpreadsheetId } from '$lib/schema';
import { ScheduleOrchestrator } from '$lib/server/ScheduleOrchestrator';

export const load: PageServerLoad = async ({ url }) => {
	const program = Effect.gen(function* () {
		const scheduleStore = yield* ScheduleStore;
		const scheduleOrchestrator = yield* ScheduleOrchestrator;

		const schedules = yield* scheduleStore.get;
		const meta = yield* scheduleOrchestrator.getSchedulesMeta(schedules);

		const scheduleList = yield* pipe(
			meta.sorted,
			Effect.forEach(
				Effect.fn(function* ({ id, days }) {
					const url = yield* Schema.encode(URLFromSpreadsheetId)(id);
					const label = yield* scheduleOrchestrator.getScheduleLabel(days);
					return { id, url, label };
				}),
				{ concurrency: 'unbounded' }
			)
		);

		const activeId = meta.active;
		const currentId = meta.active; // TODO: determine current schedule from URL with fallback to active

		const days = pipe(
			schedules,
			Record.get(currentId),
			Option.map(({ days }) => days),
			Option.getOrElse((): readonly ScheduleDay[] => [])
		);

		const weeks = yield* Schema.decode(DisplayScheduleFromScheduleDays)(days).pipe(
			Effect.andThen(Schema.encode(DisplaySchedule))
		);

		return {
			weeks,
			schedules: scheduleList,
			currentId,
			activeId
		};
	});

	const result = await program.pipe(
		Effect.scoped,
		Effect.withSpan('load', { attributes: { pathname: url.pathname } }),
		runtime.runPromise
	);

	return result;
};
