import { Effect, Schema, Stream } from 'effect';
import { ImportRpcs, ParseSpreadsheetProgress } from './schema';
import { ScheduleDay, URLFromSpreadsheetId } from '$lib/schema';
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
					const { stream, weeks } = yield* scheduleAnalyzer.getSchedule(file);

					const estimatedTotalDays = weeks * 7; // some weeks may be partial weeks

					let days: ScheduleDay[] = [];

					return stream.pipe(
						Stream.tap((value) =>
							Effect.sync(() => {
								days.push(value);
							})
						),
						Stream.map((value) =>
							ParseSpreadsheetProgress.make({
								value,
								progress: days.length / estimatedTotalDays
							})
						),
						Stream.onDone(() =>
							Effect.gen(function* () {
								console.log('save some data!', days.length);
							})
						)
					);
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
