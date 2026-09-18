import { Context, Effect, FileSystem, Layer } from 'effect';
import { FetchHttpClient, HttpClient, HttpClientError, HttpClientResponse } from 'effect/unstable/http';

export class GoogleSheetsClient extends Context.Service<
	GoogleSheetsClient,
	{ readonly download: (spreadsheetId: string) => Effect.Effect<Uint8Array, HttpClientError.HttpClientError> }
>()('GoogleSheetsClient', {
	make: Effect.gen(function* () {
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
					Effect.flatMap(() =>
						httpClient.get(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?${exportParams}`)
					),
					Effect.flatMap(HttpClientResponse.filterStatusOk),
					Effect.flatMap((res) => res.arrayBuffer),
					Effect.map((buffer) => new Uint8Array(buffer)),
					Effect.tap(() => Effect.log('Download complete')),
					Effect.withLogSpan('GoogleSheetsClient.download')
				)
		};
	})
}) {
	static readonly layer = Layer.effect(this, this.make).pipe(Layer.provide(FetchHttpClient.layer));

	static readonly layerDevelopment = Layer.unwrap(
		Effect.promise(() => import('@effect/platform-node')).pipe(
			Effect.map(({ NodeFileSystem }) =>
				Layer.effect(
					GoogleSheetsClient,
					Effect.gen(function* () {
						const fs = yield* FileSystem.FileSystem;

						return {
							download: () =>
								fs.readFile('mocks/GoogleSheetsClient/default.pdf').pipe(
									Effect.tap(() => Effect.log('Fetching mock PDF from file system')),
									Effect.map((file) => new Uint8Array(file)),
									Effect.orDie
								)
						};
					})
				).pipe(Layer.provide(NodeFileSystem.layer))
			)
		)
	);
}
