import { Data, Effect, Option, Stream, Chunk } from 'effect';

import oboe, { type FailReason } from 'oboe';

export class JsonStreamError extends Data.TaggedError('JsonArrayStreamerError')<{
	cause: FailReason;
}> {}

export class JsonArrayStreamer extends Effect.Service<JsonArrayStreamer>()('JsonArrayStreamer', {
	effect: Effect.gen(function* () {
		return {
			transform: <E>(textStream: Stream.Stream<string, E>) =>
				Effect.gen(function* () {
					const ob = oboe();

					const jsonStream = Stream.asyncPush<unknown, JsonStreamError>((emit) => {
						return Effect.sync(() => {
							ob.node('![*]', (item: unknown) => {
								emit.chunk(Chunk.make(item));
							});
							ob.fail((cause) => {
								emit.fail(new JsonStreamError({ cause }));
							});
							ob.on('done', () => {
								emit.end();
							});
						});
					});

					yield* Stream.runForEach(textStream, (text) => {
						return Effect.sync(() => ob.emit('data', text));
					}).pipe(Effect.withSpan('runForEach'), Effect.forkDaemon);

					return jsonStream;
				}).pipe(Effect.withSpan('JsonArrayStreamer.transform'))
		};
	})
}) {}
