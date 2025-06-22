import { runtime } from '$lib/server/runtime';
import { Console, Effect, Stream } from 'effect';
import { AnthropicClient } from '$lib/server/AnthropicClient';
import { ChatEntry } from '$lib/server/schema';
import type { RequestHandler } from './$types';
import { JsonStreamParser } from '$lib/server/JsonStreamParser';
import { HttpServerResponse } from '@effect/platform';

export const POST: RequestHandler = async ({ request, url }) => {
	const program = Effect.gen(function* () {
		const anthropic = yield* AnthropicClient;

		const formData = yield* Effect.promise(() => request.formData());
		const file = formData.get('file');

		if (!(file instanceof File)) {
			throw new Error('Expected a file to be uploaded');
		}

		return Stream.unwrap(anthropic.send(file)).pipe(
			Stream.transduce(JsonStreamParser.makeSink(ChatEntry)),
			Stream.flattenChunks,
			Stream.map(JSON.stringify),
			Stream.tapErrorCause((error) => Effect.logError('Stream failed with error', error)),
			Stream.toReadableStream
		);
	});

	const readable = await program.pipe(
		Effect.scoped,
		Effect.withSpan('POST', { attributes: { pathname: url.pathname } }),
		runtime.runPromise
	);

	return new Response(readable);
};
