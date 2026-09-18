import { Array, Context, DateTime, Effect, Layer, Option, pipe, Schema, Stream } from 'effect';
import { GoogleSheetsClient } from './GoogleSheetsClient';
import { KeyValueStore } from './KeyValueStore';
import { ScheduleAnalyzer } from './ScheduleAnalyzer';
import { PotterySchedule, ScheduleDay, URLFromSpreadsheetId } from './schema';
import { nanoid } from 'nanoid';

export class ScheduleRepo extends Context.Service<
	ScheduleRepo,
	{
		readonly create: (
			spreadsheetURL: string
		) => Effect.Effect<{ readonly stream: Stream.Stream<ScheduleDay, unknown>; readonly id: string }, any>;
		readonly list: (options?: { readonly published?: boolean }) => Effect.Effect<PotterySchedule[], any>;
		readonly get: (id: string) => Effect.Effect<Option.Option<PotterySchedule>, any>;
		readonly getFile: (id: string) => Effect.Effect<Option.Option<Uint8Array>, any>;
		readonly update: (id: string, schedule: Partial<PotterySchedule>) => Effect.Effect<PotterySchedule, any>;
		readonly delete: (id: string) => Effect.Effect<void, any>;
	}
>()('ScheduleRepo', {
	make: Effect.gen(function* () {
		const googleSheetsClient = yield* GoogleSheetsClient;
		const scheduleAnalyzer = yield* ScheduleAnalyzer;

		const kv = yield* KeyValueStore;
		const scheduleKv = yield* kv.forSchema(PotterySchedule, 'schedule');
		const fileKv = yield* kv.forSchema(Schema.Uint8ArrayFromBase64, 'files');

		const create = Effect.fn('create')(function* (spreadsheetURL: string) {
			const spreadsheetId = yield* Schema.decodeEffect(URLFromSpreadsheetId)(spreadsheetURL);
			const file = yield* googleSheetsClient.download(spreadsheetId);

			const days: ScheduleDay[] = [];
			const id = nanoid(8).replace(/_|-/g, 'a');
			const now = yield* DateTime.nowAsDate;

			const save = Effect.gen(function* () {
				yield* fileKv.set(id, file);
				const schedule = PotterySchedule.make({
					id,
					days,
					createdAt: now,
					spreadsheetId,
					published: false
				});
				yield* scheduleKv.set(id, schedule);
				yield* Effect.log(`Saved schedule id=${id}`);
			});

			const stream = scheduleAnalyzer.analyze(file).pipe(
				Stream.tap((day) => {
					days.push(day);
					return Effect.void;
				}),
				Stream.onEnd(save)
			);

			return { stream, id };
		});

		const list = Effect.fn('list')(function* ({ published = false } = {}) {
			const ids = yield* scheduleKv.list();

			const schedules = yield* Effect.all(
				ids.map((id) => scheduleKv.get(id).pipe(Effect.flatMap(Effect.fromOption))),
				{ concurrency: 'unbounded' }
			);

			return pipe(
				schedules,
				Array.sortBy(PotterySchedule.order),
				Array.filter((schedule) => (published ? schedule.published : true))
			);
		});

		const get = Effect.fn('get')(function* (id: string) {
			return yield* scheduleKv.get(id);
		});

		const getFile = Effect.fn('getFile')(function* (id: string) {
			return yield* fileKv.get(id);
		});

		const update = Effect.fn('delete')(function* (id: string, schedule: Partial<PotterySchedule>) {
			const current = yield* scheduleKv.get(id).pipe(Effect.flatMap(Effect.fromOption));
			const next = PotterySchedule.make({ ...current, ...schedule });
			yield* scheduleKv.set(id, next);
			return next;
		});

		const del = Effect.fn('delete')(function* (id: string) {
			yield* fileKv.delete(id);
			yield* scheduleKv.delete(id);
		});

		return {
			create,
			list,
			get,
			getFile,
			update,
			delete: del
		};
	})
}) {
	static readonly layer = Layer.effect(this, this.make).pipe(
		Layer.provide(Layer.merge(GoogleSheetsClient.layer, ScheduleAnalyzer.layer))
	);
}
