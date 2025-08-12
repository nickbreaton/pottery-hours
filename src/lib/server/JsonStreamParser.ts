import { Channel, Chunk, Data, Effect, Schema, Sink } from 'effect';
import oboe from 'oboe';

class JsonStreamParseError extends Data.TaggedError('JsonStreamError')<{
	cause: unknown;
}> {}

// TODO: revist using Stream.pipeThroughChannel
export class JsonStreamParser {
	static makeSink<A, I, R>(schema: Schema.Schema<A, I, R>) {
		const ob = oboe();
		const nil = Symbol('nil');

		let parsed: unknown = nil;
		let error: oboe.FailReason | typeof nil = nil;

		ob.node('![*]', (item: unknown) => {
			parsed = item;
		});

		ob.fail((cause) => {
			error = cause;
		});

		const channel = Channel.readWith({
			onInput: (chunk: Chunk.Chunk<unknown>) => {
				Chunk.forEach(chunk, (c) => {
					if (typeof c === 'string') {
						ob.emit('data', c);
					}
				});

				if (parsed !== nil) {
					let actual = parsed;
					parsed = nil;
					return Channel.succeed(Chunk.of(actual));
				}

				if (error !== nil) {
					return Channel.fail(new JsonStreamParseError({ cause: error }));
				}

				return Channel.succeed(Chunk.empty<unknown>());
			},
			onFailure: (error) => Channel.fail(new JsonStreamParseError({ cause: error })),
			onDone: () => Channel.succeed(Chunk.empty<unknown>())
		});

		return Sink.fromChannel(channel).pipe(
			Sink.mapEffect((chunk) => {
				return Effect.gen(function* () {
					const effects = Chunk.map(chunk, (part) => Schema.decodeUnknown(schema)(part));
					return Chunk.fromIterable(yield* Effect.all(effects));
				});
			})
		);
	}
}
