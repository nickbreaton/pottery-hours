import { Effect } from 'effect';
import type { RequestHandler } from '../api/new/$types';
import { ScheduleRepo } from '$lib/server/ScheduleRepo';
import { runtime } from '$lib/server/runtime';

export const GET: RequestHandler = async ({ params }) => {
	const handler = Effect.gen(function* () {
		const repo = yield* ScheduleRepo;
		// TODO: probably put this in a Calendar service
		const published = yield* repo.list({ published: true });
	});

	const response = await runtime.runPromise(handler);

	// TODO: ics format
	return new Response('TODO: ics feed');
};
