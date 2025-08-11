import { Effect, Layer, List, MutableList, Random, Schema, Stream } from 'effect';
import { GoogleSheetsClient } from './GoogleSheetsClient';
import { PotterySchedule, ScheduleDay, URLFromSpreadsheetId } from './schema';
import { ScheduleAnalyzer } from './ScheduleAnalyzer';
import { KeyValueStore } from './KeyValueStore';

export class ScheduleRepo extends Effect.Service<ScheduleRepo>()('ScheduleRepo', {
	dependencies: [GoogleSheetsClient.Default, ScheduleAnalyzer.Default, KeyValueStore.Default],
	effect: Effect.gen(function* () {
		const googleSheetsClient = yield* GoogleSheetsClient;
		const scheduleAnalyzer = yield* ScheduleAnalyzer;
		const kv = (yield* KeyValueStore).forSchema(PotterySchedule);

		const create = Effect.fn('create')(function* (spreadsheetURL: string) {
			const url = yield* Schema.decode(URLFromSpreadsheetId)(spreadsheetURL);
			const file = yield* googleSheetsClient.download(url);

			const days: ScheduleDay[] = [];
			const id = `S${crypto.randomUUID()}` as const;

			const save = Effect.fn(function* () {
				yield* kv.set(id, PotterySchedule.make({ id, days }));
				console.log(yield* kv.list());
			});

			const stream = scheduleAnalyzer.analyze(file).pipe(
				Stream.tap((day) => {
					days.push(day);
					return Effect.void;
				}),
				Stream.onEnd(save())
			);

			return stream;
		});

		const list = kv.list();

		const get = Effect.fn('get')(function* (id: string) {
			return yield* kv.get(id);
		});

		const del = Effect.fn('delete')(function* (id: string) {
			return yield* kv.delete(id);
		});

		return {
			create,
			list,
			get,
			delete: del
		};
	})
}) {}
