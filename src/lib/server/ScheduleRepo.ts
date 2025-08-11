import { Array, DateTime, Effect, Layer, List, MutableList, Order, Random, Schema, Stream } from 'effect';
import { GoogleSheetsClient } from './GoogleSheetsClient';
import { PotterySchedule, ScheduleDay, URLFromSpreadsheetId } from './schema';
import { ScheduleAnalyzer } from './ScheduleAnalyzer';
import { KeyValueStore } from './KeyValueStore';

export class ScheduleRepo extends Effect.Service<ScheduleRepo>()('ScheduleRepo', {
	dependencies: [GoogleSheetsClient.Default, ScheduleAnalyzer.Default, KeyValueStore.Default],
	effect: Effect.gen(function* () {
		const googleSheetsClient = yield* GoogleSheetsClient;
		const scheduleAnalyzer = yield* ScheduleAnalyzer;
		const scheduleKv = (yield* KeyValueStore).forSchema(PotterySchedule, 'schedule');
		const fileKv = (yield* KeyValueStore).forSchema(Schema.Uint8ArrayFromBase64, 'files');

		const create = Effect.fn('create')(function* (spreadsheetURL: string) {
			const spreadsheetId = yield* Schema.decode(URLFromSpreadsheetId)(spreadsheetURL);
			const file = yield* googleSheetsClient.download(spreadsheetId);

			const days: ScheduleDay[] = [];
			const id = crypto.randomUUID();
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

			return stream;
		});

		// TODO: when building calendar ensure we filter out non-published
		const list = Effect.fn('list')(function* () {
			const ids = yield* scheduleKv.list();

			const schedules = yield* Effect.all(
				ids.map((id) => scheduleKv.get(id).pipe(Effect.flatten)),
				{ concurrency: 'unbounded' }
			);

			// TODO: file and fix bug https://github.com/Effect-TS/effect/commit/9dd8979e940915b1cc1b1f264f3d019c77a65a02
			return Array.sortBy(PotterySchedule.order)(schedules) as PotterySchedule[];
		});

		const get = Effect.fn('get')(function* (id: string) {
			return yield* scheduleKv.get(id);
		});

		const getFile = Effect.fn('getFile')(function* (id: string) {
			return yield* fileKv.get(id);
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
			delete: del
		};
	})
}) {}
