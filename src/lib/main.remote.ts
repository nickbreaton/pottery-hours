import { query } from '$app/server';
import { Effect } from 'effect';
import { KeyValueStore } from '$lib/server/KeyValueStore';
import { ScheduleRepo } from './server/ScheduleRepo';
import { runtime } from '$lib/server/runtime';

export const getSchedules = query(() => {
	const program = Effect.gen(function* () {
		const repo = yield* ScheduleRepo;
		return yield* repo.list;
	});
	return runtime.runPromise(program);
});
