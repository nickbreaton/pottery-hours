import { Effect, Stream } from 'effect';
import { ImportRpcs } from './schema';
import { ScheduleDay } from '$lib/schema';
import { ScheduleAnalyzer } from '$lib/server/ScheduleAnalyzer';
import { GoogleSheetsClient } from '$lib/server/GoogleSheetsClient';

export const ImportLive = ImportRpcs.toLayer(
	Effect.gen(function* () {
		return {
			ParseSpreadsheet: () =>
				Stream.fromIterable([
					ScheduleDay.make({
						day: 1,
						month: 'January',
						year: 2025,
						hours: [],
						label: 'rest'
					})
				])
		};
	})
);
