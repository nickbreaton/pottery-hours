import { runtime } from '$lib/server/runtime';
import { Chunk, Effect, Schema, Stream } from 'effect';
import type { PageServerLoad } from './$types';
import { ScheduleAnalyzer } from '$lib/server/ScheduleAnalyzer';
import { DisplaySchedule, DisplayScheduleFromScheduleDays } from '$lib/schema/display';

export const load: PageServerLoad = async ({ url }) => {
	const program = Effect.gen(function* () {
		// Temporary get days directly from parser (since its mocked),
		// we'll want to fetch this from our store at some point
		const scheduleAnalyzer = yield* ScheduleAnalyzer;
		const schedule = yield* scheduleAnalyzer.getSchedule(new Uint8Array()).pipe(
			Effect.map((result) => result.stream),
			Stream.unwrap,
			Stream.runCollect,
			Effect.map(Chunk.toArray)
		);

		const weeks = yield* Schema.decode(DisplayScheduleFromScheduleDays)(schedule).pipe(
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
