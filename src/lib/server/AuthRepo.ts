import { Context, Effect, Layer } from 'effect';
import * as Config from 'effect/Config';
import * as Redacted from 'effect/Redacted';
import * as Schema from 'effect/Schema';

export class AuthRepo extends Context.Service<
	AuthRepo,
	{ readonly validate: (untrusted: unknown) => Effect.Effect<boolean, Schema.SchemaError> }
>()('AuthRepo', {
	make: Effect.gen(function* () {
		const secret = yield* Config.Redacted('AUTH_SECRET');

		return {
			validate: Effect.fn('validate')(function* (untrusted: unknown) {
				const parsed = yield* Schema.decodeUnknownEffect(Schema.String)(untrusted);
				return Redacted.value(secret) === parsed;
			})
		};
	})
}) {
	static readonly layer = Layer.effect(this, this.make);
	static COOKIE_NAME = 'auth_secret';
}
