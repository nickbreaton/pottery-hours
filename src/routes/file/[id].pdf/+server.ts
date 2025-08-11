import { Effect, Option } from 'effect';
import type { RequestHandler } from './$types';
import { ScheduleRepo } from '$lib/server/ScheduleRepo';
import { error } from '@sveltejs/kit';
import { runtime } from '$lib/server/runtime';
import { HttpServerResponse } from '@effect/platform';

export const GET: RequestHandler = async ({ params }) => {
	const handler = Effect.gen(function* () {
		const repo = yield* ScheduleRepo;
		const file = yield* repo.getFile(params.id);
		return Option.map(file, (file) => HttpServerResponse.uint8Array(file, { contentType: 'application/pdf' }));
	});

	const response = await runtime.runPromise(handler);

	if (Option.isNone(response)) {
		error(404);
	}

	return HttpServerResponse.toWeb(response.value);
};
