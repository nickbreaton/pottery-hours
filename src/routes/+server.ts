import { runtime } from '$lib/server/runtime';
import { Channel, Console, Effect, Schema, Sink, Stream, Chunk, Data } from 'effect';
import { AnthropicClient } from '$lib/server/AnthropicClient';
import { ChatEntry } from '$lib/server/schema';
import type { RequestHandler } from './$types';
import oboe from 'oboe';

class JsonStreamError extends Data.TaggedError('JsonStreamError')<{
	cause: unknown;
}> {}

export const POST: RequestHandler = async ({ request }) => {
	const program = Effect.gen(function* () {
		const anthropic = yield* AnthropicClient;

		const formData = yield* Effect.promise(() => request.formData());
		const file = formData.get('file');

		if (!(file instanceof File)) {
			throw new Error('Expected a file to be uploaded');
		}

		// // Acquire the resource once for the entire stream
		// const resource = yield* Effect.acquireRelease(
		// 	Effect.sync(() => {
		// 		const resource = Math.random();
		// 		console.log('Acquired resource:', resource);
		// 		return resource;
		// 	}),
		// 	(resource) => Effect.sync(() => console.log('Released resource:', resource))
		// );

		const ob = oboe();
		const nil = Symbol('nil');

		let parsed: unknown = nil;
		let error: oboe.FailReason | typeof nil = nil;

		// TODO: This is not async, but what if it was? How could we make it async?
		ob.node('![*]', (item: unknown) => {
			parsed = item;
		});

		ob.fail((cause) => {
			error = cause;
		});

		const textStream = (yield* anthropic.send(file)).pipe(
			Stream.transduce(
				Sink.fromChannel(
					Channel.readWith({
						onInput: (chunk: Chunk.Chunk<string>) => {
							Chunk.forEach(chunk, (c) => ob.emit('data', c));

							if (parsed !== nil) {
								let actual = parsed;
								parsed = nil;
								return Channel.succeed(Chunk.of(actual));
							}

							if (error !== nil) {
								return Channel.fail(Chunk.of(new JsonStreamError({ cause: error })));
							}

							return Channel.succeed(Chunk.empty<unknown>());
						},
						onFailure: (error) => Channel.fail(error),
						onDone: () => Channel.succeed(Chunk.empty<unknown>())
					})
				)
			),
			Stream.flattenChunks
		);

		// return yield* Stream.runForEach(textStream, (chunk) => Console.log(chunk));
		return yield* Stream.toReadableStreamEffect(textStream.pipe(Stream.map(JSON.stringify)));
	});

	const stream = await runtime.runPromise(program.pipe(Effect.scoped, Effect.withSpan('POST')));

	return new Response(stream);
};
