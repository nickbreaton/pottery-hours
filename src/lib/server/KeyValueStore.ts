import { FileSystem } from '@effect/platform';
import { NodeFileSystem } from '@effect/platform-node';
import { Config, Effect, Layer, Option, Redacted, Schema } from 'effect';
import { getStore } from '@netlify/blobs';

class KeyValueError extends Schema.TaggedError<KeyValueError>('KeyValueError')('KeyValueError', {}) {}

const asKeyValueError = Effect.catchAll(() => Effect.fail(new KeyValueError()));

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
			return Effect.succeed({
				set: (key: string, value: A) =>
					Effect.gen(function* () {
						const encoded = yield* Schema.encode(schema)(value);
						const data = JSON.parse(yield* fs.readFileString(path));
						data[namespace + '/' + key] = encoded;
						yield* fs.writeFileString(path, JSON.stringify(data));
					}).pipe(asKeyValueError),

				delete: (key: string) =>
					Effect.gen(function* () {
						const data = JSON.parse(yield* fs.readFileString(path));
						delete data[namespace + '/' + key];
						yield* fs.writeFileString(path, JSON.stringify(data));
					}).pipe(asKeyValueError),

				get: (key: string) =>
					Effect.gen(function* () {
						const data = JSON.parse(yield* fs.readFileString(path));
						return yield* Schema.decode(schema)(data[namespace + '/' + key]).pipe(
							Effect.map((value) => Option.some(value)),
							Effect.catchAll(() => Option.none())
						);
					}).pipe(asKeyValueError),

				list: () =>
					Effect.gen(function* () {
						return Object.keys(JSON.parse(yield* fs.readFileString(path)))
							.filter((key) => key.startsWith(namespace + '/'))
							.map((key) => key.replace(namespace + '/', ''));
					}).pipe(asKeyValueError)
			});
		};

		return { forSchema };
	})
}) {
	static Netlify = Layer.effect(
		KeyValueStore,
		Effect.succeed(
			KeyValueStore.make({
				forSchema: Effect.fn(function* (schema, namespace) {
					console.log(process.env);
					const store = getStore(namespace);

					return {
						set: (key, value) =>
							Effect.gen(function* () {
								const encoded = yield* Schema.encode(schema)(value);
								yield* Effect.promise(() => store.set(key, JSON.stringify(encoded)));
							}).pipe(asKeyValueError),

						delete: (key) => {
							return Effect.promise(() => store.delete(key));
						},

						get: (key) =>
							Effect.gen(function* () {
								const retrieved = yield* Effect.promise(() => store.get(key));

								if (retrieved === null) {
									return Option.none();
								}

								return Option.some(yield* Schema.decode(schema)(JSON.parse(retrieved)));
							}).pipe(asKeyValueError),

						list: () =>
							Effect.gen(function* () {
								const result = yield* Effect.promise(() => store.list({ paginate: false }));
								return result.blobs.map((blob) => blob.key);
							}).pipe(asKeyValueError)
					};
				})
			})
		)
	);

	static Auto = Layer.unwrapEffect(
		Effect.gen(function* () {
			const netlifySiteName = yield* Config.option(Config.string('SITE_NAME'));
			return Option.isSome(netlifySiteName) ? KeyValueStore.Netlify : KeyValueStore.Default;
		})
	);
}
