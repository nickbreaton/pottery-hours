import { runtime } from '$lib/server/runtime';
import { Effect, Stream } from 'effect';
import { ScheduleAnalyzer } from '$lib/server/ScheduleAnalyzer';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, url }) => {
	const program = Effect.gen(function* () {
		const scheduleAnalyzer = yield* ScheduleAnalyzer;

		const formData = yield* Effect.promise(() => request.formData());
		const file = formData.get('file');

		if (!(file instanceof File)) {
			throw new Error('Expected a file to be uploaded');
		}

		return scheduleAnalyzer.getSchedule(file).pipe(
			Stream.map(JSON.stringify),
			Stream.tapErrorCause((error) => Effect.logError('Stream failed with error', error)),
			Stream.toReadableStream
		);
	});

	const readable = await program.pipe(
		Effect.scoped,
		Effect.withSpan('POST', { attributes: { pathname: url.pathname } }),
		runtime.runPromise
	);

	return new Response(readable);
};
