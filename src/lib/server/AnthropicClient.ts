import { HttpBody, HttpClient, HttpClientRequest } from '@effect/platform';
import { Chunk, Config, Data, Effect, Option, Redacted, Sink, Stream } from 'effect';
import { Base64 } from './Base64';
import Anthropic from '@anthropic-ai/sdk';
import oboe from 'oboe';

class AnthropicError extends Data.TaggedError('AnthropicError')<{
	message: string;
	cause: unknown;
}> {}

export class AnthropicClient extends Effect.Service<AnthropicClient>()('AnthropicClient', {
	dependencies: [Base64.Default],
	effect: Effect.gen(function* () {
		const apiKey = yield* Config.redacted('ANTHROPIC_API_KEY');
		const base64 = yield* Base64;
		const client = new Anthropic({
			apiKey: Redacted.value(apiKey)
		});

		return {
			send: Effect.fn(function* (file: File) {
				const prompt = `
          This is a PDF representation of a pottery studio schedule for open hours.
          It's organized into blocks of time for a given day.
          There can sometimes be multiple blocks of time per day.
          Only include entries for dates that have hours defined.
          Each week also has a description in the left column which should be included in the results.

          Parse this document and return in a JSON format the hours.

          Provide results only for week 1. If that week contains not results, return an empty array.

          Ensure the JSON format provided is followed exactly. Do not add any additional text or information. Do not make up data that's not in the PDF.

          [ { "month": "January", "day": 1, "label": "Winter Session", "hours": [ { "start_hour": 9, "start_minute": 0, "start_meridiem": "AM", "end_hour": 2, "end_minute": 0, "end_meridiem": "PM" } ] } ]
        `;

				const response = client.messages.stream({
					model: 'claude-3-5-haiku-20241022',
					max_tokens: 8192,
					messages: [
						{
							role: 'user',
							content: [
								{
									type: 'document',
									source: {
										type: 'base64',
										media_type: 'application/pdf',
										data: yield* base64.fromFile(file)
									}
								},
								{ type: 'text', text: prompt }
							]
						}
					]
				});

				return Stream.asyncPush<string, AnthropicError>((emit) => {
					return Effect.sync(() => {
						response.on('text', (data) => {
							emit.chunk(Chunk.make(data));
						});
						response.on('error', (error) => {
							emit.fail(
								new AnthropicError({
									message: 'An error occurred while streaming the response.',
									cause: error
								})
							);
						});
						response.on('end', () => {
							emit.end();
						});
					});
				});
			})
		};
	})
}) {}
