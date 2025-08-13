import { AuthRepo } from '$lib/server/AuthRepo';
import { runtime } from '$lib/server/runtime';
import { error, type Handle } from '@sveltejs/kit';
import { Effect, Exit } from 'effect';

const UNAUTHED_PATH_PREFIX = ['/auth', '/calendar.ics', '/file/'];

export const handle: Handle = async ({ event, resolve }) => {
	const isUnauthedRoute = UNAUTHED_PATH_PREFIX.some((prefix) => event.url.pathname.startsWith(prefix));

	if (isUnauthedRoute) {
		return resolve(event);
	}

	const cookie = event.cookies.get(AuthRepo.COOKIE_NAME);

	const isValid = await AuthRepo.pipe(
		Effect.andThen((repo) => repo.validate(cookie)),
		runtime.runPromise
	);

	if (isValid) {
		return resolve(event);
	}

	error(401);
};
