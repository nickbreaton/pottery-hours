import { Effect } from 'effect';
import * as Config from 'effect/Config';
import * as Redacted from 'effect/Redacted';
import * as Schema from 'effect/Schema';

export class AuthRepo extends Effect.Service<AuthRepo>()('AuthRepo', {
	effect: Effect.gen(function* () {
		const secret = yield* Config.redacted('AUTH_SECRET');

		return {
			validate: Effect.fn('validate')(function* (untrusted: unknown) {
				const parsed = yield* Schema.decodeUnknown(Schema.String)(untrusted);
				return Redacted.value(secret) === parsed;
			})
		};
	})
}) {
	static COOKIE_NAME = 'auth_secret';
}
