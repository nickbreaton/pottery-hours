import { Config, Context, Effect, Layer, Redacted, Schema } from 'effect';
import { HttpClient, HttpClientRequest, HttpClientResponse, type HttpClientError } from 'effect/unstable/http';

const OcrPage = Schema.Struct({
	index: Schema.Int,
	markdown: Schema.String,
	tables: Schema.optionalKey(Schema.Array(Schema.JsonObject)),
	blocks: Schema.optionalKey(Schema.NullOr(Schema.Array(Schema.JsonObject))),
	confidence_scores: Schema.optionalKey(Schema.NullOr(Schema.JsonObject))
});

export const OcrDocument = Schema.Struct({
	pages: Schema.Array(OcrPage),
	model: Schema.String,
	usage_info: Schema.JsonObject
});

export type OcrDocument = typeof OcrDocument.Type;

export class MistralOcr extends Context.Service<
	MistralOcr,
	{
		readonly process: (
			fileData: Uint8Array
		) => Effect.Effect<OcrDocument, HttpClientError.HttpClientError | Schema.SchemaError>;
	}
>()('MistralOcr', {
	make: Effect.gen(function* () {
		const httpClient = yield* HttpClient.HttpClient;
		const apiKey = yield* Config.Redacted('MISTRAL_API_KEY');

		return {
			process: Effect.fn('MistralOcr.process')(function* (fileData: Uint8Array) {
				const base64 = yield* Schema.encodeEffect(Schema.Uint8ArrayFromBase64)(fileData);
				const request = HttpClientRequest.post('https://api.mistral.ai/v1/ocr').pipe(
					HttpClientRequest.bearerToken(Redacted.value(apiKey)),
					HttpClientRequest.bodyJsonUnsafe({
						model: 'mistral-ocr-latest',
						document: {
							type: 'document_url',
							document_url: `data:application/pdf;base64,${base64}`,
							document_name: 'schedule.pdf'
						},
						table_format: 'html',
						include_blocks: true,
						confidence_scores_granularity: 'block',
						include_image_base64: false
					})
				);

				return yield* httpClient.execute(request).pipe(
					Effect.flatMap(HttpClientResponse.filterStatusOk),
					Effect.flatMap(HttpClientResponse.schemaBodyJson(OcrDocument)),
					Effect.tap(() => Effect.log('Mistral OCR complete')),
					Effect.withLogSpan('MistralOcr.process')
				);
			})
		};
	})
}) {
	static readonly layer = Layer.effect(this, this.make);
}
