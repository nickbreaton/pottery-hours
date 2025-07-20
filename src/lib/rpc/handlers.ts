import { Effect, Record, Schema, Stream } from 'effect';
import { ImportRpcs, ParseSpreadsheetProgress } from './schema';
import { ScheduleDay, URLFromSpreadsheetId } from '$lib/schema';
import { ScheduleAnalyzer } from '$lib/server/ScheduleAnalyzer';
import { GoogleSheetsClient } from '$lib/server/GoogleSheetsClient';
import { ScheduleStore } from '$lib/server/ScheduleStore';

export const ImportLive = ImportRpcs.toLayer(
	Effect.gen(function* () {
		const scheduleAnalyzer = yield* ScheduleAnalyzer;
		const googleSheetsClient = yield* GoogleSheetsClient;
		const scheduleStore = yield* ScheduleStore;

		return {
			DeleteSchedule: ({ id }) =>
				scheduleStore.update((values) => {
					const { [id]: _, ...rest } = values;
					return rest;
				}),
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
							scheduleStore.update((values) => ({
								...values,
								[spreadsheetId]: { days: days as [ScheduleDay, ...ScheduleDay[]] }
							}))
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
