import { Effect } from 'effect';
import type { RequestHandler } from '../api/new/$types';
import { ScheduleRepo } from '$lib/server/ScheduleRepo';
import { runtime } from '$lib/server/runtime';
import { CalendarRepo } from '$lib/server/CalendarRepo';

export const GET: RequestHandler = async ({ url }) => {
	const handler = Effect.gen(function* () {
		const repo = yield* CalendarRepo;
		return yield* repo.feed;
	});

	const response = await runtime.runPromise(handler);

	// TODO: ics format
	return new Response(response, {
		headers: url.searchParams.has('format', 'text')
			? {}
			: {
					'Content-Type': 'text/calendar; charset=utf-8',
					'Content-Disposition': 'attachment; filename="calendar.ics"'
				}
	});
};
