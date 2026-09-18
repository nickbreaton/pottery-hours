import { AuthRepo } from '$lib/server/AuthRepo';
import { runtime } from '$lib/server/runtime';
import { error, redirect, type Handle } from '@sveltejs/kit';

const UNAUTHED_PATH_PREFIX = ['/login', '/calendar.ics', '/file/', '/favicon.svg'];

export const handle: Handle = async ({ event, resolve }) => {
	const isUnauthedRoute = UNAUTHED_PATH_PREFIX.some((prefix) => event.url.pathname.startsWith(prefix));

	if (isUnauthedRoute) {
		return resolve(event);
	}

	const cookie = event.cookies.get(AuthRepo.COOKIE_NAME);

	const isValid = await runtime.runPromise(AuthRepo.use((repo) => repo.validate(cookie ?? '')));

	if (isValid) {
		return resolve(event);
	}

	redirect(302, '/login');
};
