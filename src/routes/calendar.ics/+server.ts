import { CalendarRepo } from '$lib/server/CalendarRepo';
import { runtime } from '$lib/server/runtime';
import { Effect } from 'effect';
import type { RequestHandler } from '../api/new/$types';

export const GET: RequestHandler = async ({ url, request }) => {
	const handler = Effect.gen(function* () {
		const repo = yield* CalendarRepo;

		yield* Effect.log(`Request for calendar feed`).pipe(
			Effect.annotateLogs({ userAgent: request.headers.get('User-Agent') })
		);

		return yield* repo.feed({ origin: url.origin });
	});

	const response = await runtime.runPromise(handler);

	return new Response(response, {
		headers: url.searchParams.has('format', 'text')
			? {}
			: {
					'Content-Type': 'text/calendar; charset=utf-8',
					'Content-Disposition': 'attachment; filename="calendar.ics"'
				}
	});
};
