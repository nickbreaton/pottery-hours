import { runtime } from '$lib/server/runtime';
import { Chunk, Effect, Option, Record, Schema, Stream } from 'effect';
import type { PageServerLoad } from './$types';
import { ScheduleAnalyzer } from '$lib/server/ScheduleAnalyzer';
import { DisplaySchedule, DisplayScheduleFromScheduleDays } from '$lib/schema/display';
import { ScheduleStore } from '$lib/server/ScheduleStore';

export const load: PageServerLoad = async ({ url }) => {
	const program = Effect.gen(function* () {
		const scheduleStore = yield* ScheduleStore;

		const days = yield* scheduleStore.get.pipe(
			Effect.map(Record.findFirst(() => true)),
			Effect.map(Option.map(([key, value]) => value.days)),
			Effect.andThen(Option.getOrElse(() => []))
		);

		const weeks = yield* Schema.decode(DisplayScheduleFromScheduleDays)(days).pipe(
			Effect.andThen(Schema.encode(DisplaySchedule))
		);

		return { weeks };
	});

	const result = await program.pipe(
		Effect.scoped,
		Effect.withSpan('load', { attributes: { pathname: url.pathname } }),
		runtime.runPromise
	);

	return result;
};
