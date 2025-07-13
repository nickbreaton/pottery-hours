import { Effect, Schema, Stream } from 'effect';
import { ImportRpcs } from './schema';
import { URLFromSpreadsheetId } from '$lib/schema';
import { ScheduleAnalyzer } from '$lib/server/ScheduleAnalyzer';
import { GoogleSheetsClient } from '$lib/server/GoogleSheetsClient';

export const ImportLive = ImportRpcs.toLayer(
	Effect.gen(function* () {
		const scheduleAnalyzer = yield* ScheduleAnalyzer;
		const googleSheetsClient = yield* GoogleSheetsClient;

		return {
			ParseSpreadsheet: ({ url }) =>
				Effect.gen(function* () {
					const spreadsheetId = yield* Schema.decode(URLFromSpreadsheetId)(url);
					const file = yield* googleSheetsClient.download(spreadsheetId);
					return scheduleAnalyzer.getSchedule(file);
				}).pipe(
					Stream.unwrap,
					Stream.mapError((error) => {
						if (error._tag === 'ParseError') {
							return 'Invalid spreadsheet URL';
						}
						return 'Something went wrong';
					})
				)
		};
	})
);
