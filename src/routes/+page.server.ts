import { runtime } from '$lib/server/runtime';
import { Effect, Option, pipe, Record, Schema } from 'effect';
import type { PageServerLoad } from './$types';
import { DisplaySchedule, DisplayScheduleFromScheduleDays } from '$lib/schema/display';
import { ScheduleStore } from '$lib/server/ScheduleStore';
import { URLFromSpreadsheetId } from '$lib/schema';
import { ScheduleOrchestrator } from '$lib/server/ScheduleOrchestrator';
import { error, redirect } from '@sveltejs/kit';
import { withSvelteKitResponses } from '$lib/compat/responses';

export const load: PageServerLoad = async ({ url }) => {
	const program = Effect.gen(function* () {
		const scheduleStore = yield* ScheduleStore;
		const scheduleOrchestrator = yield* ScheduleOrchestrator;

		const schedules = yield* scheduleStore.get;
		const meta = yield* scheduleOrchestrator.getSchedulesMeta(schedules);

		const scheduleList = yield* pipe(
			meta.sorted,
			Effect.forEach(
				Effect.fn(function* ({ id, days }) {
					const url = yield* Schema.encode(URLFromSpreadsheetId)(id);
					const label = yield* scheduleOrchestrator.getScheduleLabel(days);
					return { id, url, label };
				}),
				{ concurrency: 'unbounded' }
			)
		);

		const activeId = meta.active;
		const parsedId = url.pathname.match(/^\/schedule\/(.*)$/)?.[1];

		if (parsedId === meta.active && url.pathname !== '/') {
			throw redirect(302, '/'); // keep URL pretty for active schedule
		}

		const currentId = parsedId ?? meta.active;

		const days = pipe(
			schedules,
			Record.get(currentId),
			Option.map(({ days }) => days)
		);

		if (Option.isNone(days)) {
			throw error(404);
		}

		const weeks = yield* Schema.decode(DisplayScheduleFromScheduleDays)(days.value).pipe(
			Effect.andThen(Schema.encode(DisplaySchedule))
		);

		return {
			weeks,
			schedules: scheduleList,
			currentId,
			activeId
		};
	});

	const result = await program.pipe(
		Effect.scoped,
		Effect.withSpan('load', { attributes: { pathname: url.pathname } }),
		runtime.runPromise,
		withSvelteKitResponses
	);

	return result;
};
