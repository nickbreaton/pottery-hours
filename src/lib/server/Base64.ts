import { Effect } from 'effect';

export class Base64 extends Effect.Service<Base64>()('Base64', {
	effect: Effect.gen(function* () {
		return {
			fromFile: Effect.fn(function* (file: File) {
				const arrayBuffer = yield* Effect.tryPromise(() => file.arrayBuffer());
				// @ts-ignore
				const result: string = Buffer.from(arrayBuffer).toString('base64');
				return result;
			})
		};
	})
}) {}
