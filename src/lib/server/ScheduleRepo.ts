import { DateTime, Effect, Layer, List, MutableList, Random, Schema, Stream } from 'effect';
import { GoogleSheetsClient } from './GoogleSheetsClient';
import { PotterySchedule, ScheduleDay, SpreadsheetURL } from './schema';
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
			const url = yield* Schema.decode(SpreadsheetURL)(spreadsheetURL);
			const file = yield* googleSheetsClient.download(url);

			const days: ScheduleDay[] = [];
			const id = crypto.randomUUID();
			const now = yield* DateTime.nowAsDate;

			const save = Effect.gen(function* () {
				yield* fileKv.set(id, file);
				yield* scheduleKv.set(id, PotterySchedule.make({ id, days, createdAt: now }));
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

		const list = scheduleKv.list();

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
