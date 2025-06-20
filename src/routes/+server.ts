import { runtime } from '$lib/server/runtime';
import { Console, Effect, Schema, Stream } from 'effect';
import { AnthropicClient } from '$lib/server/AnthropicClient';
import { JsonArrayStreamer } from '$lib/server/JsonArrayStreamer';
import { ChatEntry } from '$lib/server/schema';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const program = Effect.gen(function* () {
		const anthropic = yield* AnthropicClient;
		const streamer = yield* JsonArrayStreamer;

		const formData = yield* Effect.promise(() => request.formData());
		const file = formData.get('file');

		if (!(file instanceof File)) {
			throw new Error('Expected a file to be uploaded');
		}

		const textStream = yield* anthropic.send(file);
		const jsonStream = (yield* streamer.transform(textStream)).pipe(
			Stream.mapEffect(Schema.decodeUnknown(ChatEntry))
		);

		return yield* Stream.toReadableStreamEffect(
			jsonStream.pipe(Stream.mapEffect(Schema.encode(ChatEntry)), Stream.tap(Console.log))
		);
	});

	const stream = await runtime.runPromise(program.pipe(Effect.scoped));

	return new Response(stream);
};
