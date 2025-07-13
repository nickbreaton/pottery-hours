import { Effect, Schema } from 'effect';
import { ScheduleAnalyzer } from './ScheduleAnalyzer';
import type { DisplaySchedule } from '$lib/schema/display';
import { ScheduleDay } from '$lib/schema';

export const ScheduleStoreMap = Schema.Record({
	key: Schema.String,
	value: Schema.Struct({
		days: Schema.Array(ScheduleDay)
	})
});

export type ScheduleStoreMap = typeof ScheduleStoreMap.Type;

declare global {
	// eslint-disable-next-line no-var
	var scheduleStoreValue: ScheduleStoreMap | undefined;
}

export class ScheduleStore extends Effect.Service<ScheduleStore>()('ScheduleStore', {
	effect: Effect.gen(function* () {
		return {
			set(data: ScheduleStoreMap) {
				return Effect.sync(() => {
					globalThis.scheduleStoreValue = data;
				});
			},
			update(updater: (map: ScheduleStoreMap) => ScheduleStoreMap) {
				return Effect.sync(() => {
					globalThis.scheduleStoreValue = updater(globalThis.scheduleStoreValue ?? {});
				});
			},
			get: Effect.sync(() => globalThis.scheduleStoreValue ?? {})
		};
	})
}) {}
