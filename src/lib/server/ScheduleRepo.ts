import { Effect, Schema, Stream } from 'effect';
import { GoogleSheetsClient } from './GoogleSheetsClient';
import { ScheduleDay, URLFromSpreadsheetId } from './schema';

export class ScheduleRepo extends Effect.Service<ScheduleRepo>()('ScheduleRepo', {
	dependencies: [GoogleSheetsClient.Default],
	effect: Effect.gen(function* () {
		const googleSheetsClient = yield* GoogleSheetsClient;

		const create = Effect.fn('create')(function* (spreadsheetURL: string) {
			const url = yield* Schema.decode(URLFromSpreadsheetId)(spreadsheetURL);

			// const data = yield* Schema.decode(CreateEvent)({ type: 'data', data: 1 });

			const month = ScheduleDay.make({
				day: 1,
				month: 'April',
				year: 2025,
				hours: [],
				label: 'test'
			});

			return Stream.succeed(month);
		});

		return {
			create
		};
	})
}) {}
