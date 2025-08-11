import { command, query } from '$app/server';
import { Effect, Option, Schema } from 'effect';
import { KeyValueStore } from '$lib/server/KeyValueStore';
import { ScheduleRepo } from './server/ScheduleRepo';
import { runtime } from '$lib/server/runtime';
import { PotterySchedule } from './server/schema';
import { error, redirect } from '@sveltejs/kit';

export const getSchedules = query(() => {
	const handler = Effect.gen(function* () {
		const repo = yield* ScheduleRepo;
		return yield* repo.list;
	});

	return runtime.runPromise(handler);
});

export const getSchedule = query(Schema.standardSchemaV1(Schema.String), (id) => {
	const handler = Effect.gen(function* () {
		const repo = yield* ScheduleRepo;
		const schedule = yield* repo.get(id);

		if (Option.isNone(schedule)) {
			// TODO: This doesnt actually work with effect rn
			error(404, 'Schedule not found');
		}

		return yield* Schema.encode(PotterySchedule)(schedule.value);
	});

	return runtime.runPromise(handler);
});

export const deleteSchedule = command(Schema.standardSchemaV1(Schema.String), async (id) => {
	const handler = Effect.gen(function* () {
		const repo = yield* ScheduleRepo;
		yield* repo.delete(id);
	});

	await Promise.all([getSchedule(id).refresh(), getSchedules().refresh()]);
	await runtime.runPromise(handler);

	// TODOL this does not appear to work
	redirect(302, '/');
});
