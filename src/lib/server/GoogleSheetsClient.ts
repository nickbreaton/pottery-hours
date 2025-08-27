import { FetchHttpClient, FileSystem, HttpClient, HttpClientRequest, HttpClientResponse } from '@effect/platform';
import { Effect, Layer } from 'effect';

export class GoogleSheetsClient extends Effect.Service<GoogleSheetsClient>()('GoogleSheetsClient', {
	dependencies: [FetchHttpClient.layer],
	effect: Effect.gen(function* () {
		const httpClient = yield* HttpClient.HttpClient;

		const exportParams = new URLSearchParams({
			format: 'pdf',
			scale: '4',
			portrait: 'false',
			top_margin: '0.25',
			bottom_margin: '0.25',
			left_margin: '0.25',
			right_margin: '0.25'
		});

		return {
			download: (spreadsheetId: string) =>
				Effect.log('Downloading').pipe(
					Effect.andThen(HttpClientRequest.make('GET')('https://docs.google.com/spreadsheets/d/')),
					Effect.andThen(HttpClientRequest.appendUrl(spreadsheetId)),
					Effect.andThen(HttpClientRequest.appendUrl('/export?' + exportParams)),
					Effect.andThen(httpClient.execute),
					Effect.andThen(HttpClientResponse.filterStatusOk),
					Effect.andThen((res) => res.arrayBuffer),
					Effect.andThen((buffer) => new Uint8Array(buffer)),
					Effect.tap(() => Effect.log('Download complete')),
					Effect.withLogSpan('GoogleSheetsClient.download')
				)
		};
	})
}) {
	static DevelopmentMock = Layer.effect(
		GoogleSheetsClient,
		Effect.gen(function* () {
			const fs = yield* FileSystem.FileSystem;

			return GoogleSheetsClient.make({
				download: () =>
					fs.readFile('mocks/GoogleSheetsClient/default.pdf').pipe(
						Effect.tap(() => Effect.log('Fetching mock PDF from file system')),
						Effect.andThen((file) => new Uint8Array(file)),
						Effect.orDie
					)
			});
		})
	);
}
