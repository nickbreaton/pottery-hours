import { HttpClient, HttpClientResponse, HttpClientRequest } from '@effect/platform';
import { Effect, Schema } from 'effect';
import { URLFromSpreadsheetId } from './schema';

export class GoogleSheetsClient extends Effect.Service<GoogleSheetsClient>()('GoogleSheetsClient', {
	effect: Effect.gen(function* () {
		const httpClient = yield* HttpClient.HttpClient;

		return {
			download: (spreadsheetId: string) =>
				Schema.encode(URLFromSpreadsheetId)(spreadsheetId).pipe(
					Effect.tap(() => Effect.log('Downloading')),
					Effect.andThen(HttpClientRequest.make('GET')),
					Effect.andThen(HttpClientRequest.appendUrl('/export?format=pdf&portrait=false')),
					Effect.andThen(httpClient.execute),
					Effect.andThen(HttpClientResponse.filterStatusOk),
					Effect.andThen((res) => res.arrayBuffer),
					Effect.andThen((buffer) => new Uint8Array(buffer)),
					Effect.tap(() => Effect.log('Download complete')),
					Effect.withLogSpan('GoogleSheetsClient.download')
				)
		};
	})
}) {}
