import { Effect, Layer, Schema, Stream, Console } from 'effect';
import { ScheduleAnalyzer } from './ScheduleAnalyzer';
import type { DisplaySchedule } from '$lib/schema/display';
import { ScheduleDay } from '$lib/schema';
import { FileSystem } from '@effect/platform';

export const ScheduleStoreMap = Schema.Record({
	key: Schema.String,
	value: Schema.Struct({
		days: Schema.NonEmptyArray(ScheduleDay)
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
			get: Effect.sync(() => {
				return globalThis.scheduleStoreValue ?? {};
			})
		};
	})
}) {
	static DevelopmentMock = Layer.effect(
		ScheduleStore,
		Effect.gen(function* () {
			const fs = yield* FileSystem.FileSystem;
			const file = 'tmp/schedule-store.json';

			const set = Effect.fn(
				function* (data: ScheduleStoreMap) {
					yield* fs.makeDirectory('tmp', { recursive: true });
					yield* fs.writeFileString(file, JSON.stringify(data));
				},
				Effect.tapError((error) => Console.error('Error', error)),
				Effect.orDie
			);

			const get = fs.readFileString(file).pipe(
				Effect.andThen(Schema.decodeUnknown(Schema.parseJson(ScheduleStoreMap))),
				Effect.catchAll(() => Effect.succeed({}))
			);

			return ScheduleStore.make({
				set,
				get,
				update: (updater) =>
					Effect.gen(function* () {
						const data = yield* get;
						yield* set(updater(data));
					})
			});
		})
	);
}
