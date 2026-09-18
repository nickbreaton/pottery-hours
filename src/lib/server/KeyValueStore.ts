import { getStore } from '@netlify/blobs';
import { Context, Effect, FileSystem, Layer, Option, Schema } from 'effect';

class KeyValueError extends Schema.TaggedError<KeyValueError>()('KeyValueError', {}) {}

const asKeyValueError = Effect.catch(() => Effect.fail(new KeyValueError()));

interface SchemaStore<A> {
	readonly set: (key: string, value: A) => Effect.Effect<void, KeyValueError>;
	readonly delete: (key: string) => Effect.Effect<void, KeyValueError>;
	readonly get: (key: string) => Effect.Effect<Option.Option<A>, KeyValueError>;
	readonly list: () => Effect.Effect<string[], KeyValueError>;
}

export class KeyValueStore extends Context.Service<
	KeyValueStore,
	{
		readonly forSchema: <A, I>(schema: Schema.Codec<A, I>, namespace: string) => Effect.Effect<SchemaStore<A>>;
	}
>()('KeyValueStore', {
	make: Effect.gen(function* () {
		const dir = './tmp';
		const path = `${dir}/kv.json`;

		const fs = yield* FileSystem.FileSystem;

		yield* fs.makeDirectory(dir, { recursive: true });

		if (!(yield* fs.exists(path))) {
			yield* fs.writeFileString(path, '{}');
		}

		const forSchema = function <A, I>(schema: Schema.Codec<A, I>, namespace: string) {
			return Effect.succeed({
				set: (key: string, value: A) =>
					Effect.gen(function* () {
						const encoded = yield* Schema.encodeEffect(schema)(value);
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
						return yield* Schema.decodeEffect(schema)(data[namespace + '/' + key]).pipe(
							Effect.map((value) => Option.some(value)),
							Effect.catch(() => Effect.succeed(Option.none()))
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
	static readonly layer = Layer.effect(this, this.make);

	static Netlify = Layer.effect(
		KeyValueStore,
		Effect.succeed({
			forSchema: Effect.fn(function* (schema, namespace) {
				// Avoid static references to the store as its internal token can expire
				const store = () =>
					getStore({
						name: namespace,
						consistency: 'strong'
					});

				return {
					set: (key, value) =>
						Effect.gen(function* () {
							const encoded = yield* Schema.encodeEffect(schema)(value);
							yield* Effect.promise(() => store().set(key, JSON.stringify(encoded)));
						}).pipe(asKeyValueError),

					delete: (key) => {
						return Effect.promise(() => store().delete(key));
					},

					get: (key) =>
						Effect.gen(function* () {
							const retrieved = yield* Effect.promise(() => store().get(key, { type: 'text' }));

							if (retrieved === null) {
								return Option.none();
							}

							return Option.some(yield* Schema.decodeEffect(schema)(JSON.parse(retrieved)));
						}).pipe(asKeyValueError),

					list: () =>
						Effect.gen(function* () {
							const result = yield* Effect.promise(() => store().list());
							return result.blobs.map((blob) => blob.key);
						}).pipe(asKeyValueError)
				};
			})
		})
	);

	static Auto = Layer.unwrap(
		Effect.gen(function* () {
			if ('Netlify' in globalThis) {
				return KeyValueStore.Netlify;
			} else {
				const { NodeFileSystem } = yield* Effect.promise(() => import('@effect/platform-node'));
				return KeyValueStore.layer.pipe(Layer.provide(NodeFileSystem.layer));
			}
		})
	);
}
