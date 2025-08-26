import { command, form, query } from '$app/server';
import { runtime } from '$lib/server/runtime';
import { error, redirect } from '@sveltejs/kit';
import { Effect, Option, Schema } from 'effect';
import { ScheduleRepo } from './server/ScheduleRepo';
import { PotterySchedule } from './server/schema';

export const getSchedules = query(() => {
	const handler = Effect.gen(function* () {
		const repo = yield* ScheduleRepo;
		return (yield* repo.list()).map((schedule) => ({
			id: schedule.id,
			published: schedule.published,
			title: schedule.title
		}));
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

export const setSchedulePublished = command(
	Schema.standardSchemaV1(Schema.Struct({ id: Schema.String, published: Schema.Boolean })),
	async ({ id, published }) => {
		const handler = Effect.gen(function* () {
			const repo = yield* ScheduleRepo;
			yield* repo.update(id, { published });
		});

		await runtime.runPromise(handler);
		await Promise.all([getSchedule(id).refresh(), getSchedules().refresh()]);
	}
);

export const deleteSchedule = command(Schema.standardSchemaV1(Schema.String), async (id) => {
	const handler = Effect.gen(function* () {
		const repo = yield* ScheduleRepo;
		yield* repo.delete(id);
	});

	await runtime.runPromise(handler);
	await getSchedules().refresh();
});
