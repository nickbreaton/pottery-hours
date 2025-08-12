import { FileSystem } from '@effect/platform';
import { NodeFileSystem } from '@effect/platform-node';
import { Effect, Option, Schema } from 'effect';

class KeyValueError extends Schema.TaggedError<KeyValueError>('KeyValueError')('KeyValueError', {}) {}

export class KeyValueStore extends Effect.Service<KeyValueStore>()('KeyValueStore', {
	dependencies: [NodeFileSystem.layer],
	effect: Effect.gen(function* () {
		const dir = './tmp';
		const path = `${dir}/kv.json`;

		const fs = yield* FileSystem.FileSystem;

		yield* fs.makeDirectory(dir, { recursive: true });

		if (!(yield* fs.exists(path))) {
			yield* fs.writeFileString(path, '{}');
		}

		const forSchema = function <A, I, R>(schema: Schema.Schema<A, I, R>, namespace: string) {
			return {
				set: (key: string, value: A) =>
					Effect.gen(function* () {
						const encoded = yield* Schema.encode(schema)(value);
						const data = JSON.parse(yield* fs.readFileString(path));
						data[namespace + '/' + key] = encoded;
						yield* fs.writeFileString(path, JSON.stringify(data));
					}).pipe(Effect.catchAll(() => Effect.fail(new KeyValueError()))),

				delete: (key: string) =>
					Effect.gen(function* () {
						const data = JSON.parse(yield* fs.readFileString(path));
						delete data[namespace + '/' + key];
						yield* fs.writeFileString(path, JSON.stringify(data));
					}),

				get: (key: string) =>
					Effect.gen(function* () {
						const data = JSON.parse(yield* fs.readFileString(path));
						return yield* Schema.decode(schema)(data[namespace + '/' + key]).pipe(
							Effect.map((value) => Option.some(value)),
							Effect.catchAll(() => Option.none())
						);
					}),

				list: () =>
					Effect.gen(function* () {
						return Object.keys(JSON.parse(yield* fs.readFileString(path)))
							.filter((key) => key.startsWith(namespace + '/'))
							.map((key) => key.replace(namespace + '/', ''));
					})
			};
		};

		return { forSchema };
	})
}) {}
