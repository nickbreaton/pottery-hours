import { command, form, query } from '$app/server';
import { Effect, Option, Schema } from 'effect';
import { KeyValueStore } from '$lib/server/KeyValueStore';
import { ScheduleRepo } from './server/ScheduleRepo';
import { runtime } from '$lib/server/runtime';
import { PotterySchedule } from './server/schema';
import { error, redirect } from '@sveltejs/kit';

export const getSchedules = query(() => {
	const handler = Effect.gen(function* () {
		const repo = yield* ScheduleRepo;
		return (yield* repo.list()).map((schedule) => schedule.id);
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

export const deleteSchedule = form(async (formData) => {
	const handler = Effect.gen(function* () {
		const repo = yield* ScheduleRepo;
		const id = yield* Schema.decodeUnknown(Schema.String)(formData.get('id'));
		yield* repo.delete(id);
	});

	await runtime.runPromise(handler);
	await getSchedules().refresh();

	redirect(302, '/');
});
