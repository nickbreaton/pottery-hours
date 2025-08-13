import { AuthRepo } from '$lib/server/AuthRepo';
import { runtime } from '$lib/server/runtime';
import { error, redirect } from '@sveltejs/kit';
import { Effect } from 'effect';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, cookies }) => {
	const url = new URL(request.url);
	const secret = url.searchParams.get('secret');

	const isValid = await AuthRepo.pipe(
		Effect.andThen((repo) => repo.validate(secret)),
		runtime.runPromise
	);

	if (isValid) {
		cookies.set(AuthRepo.COOKIE_NAME, secret!, {
			path: '/',
			httpOnly: true,
			secure: url.protocol === 'https',
			sameSite: 'strict',
			expires: new Date('2100-01-01')
		});

		redirect(302, '/');
	}

	error(401);
};
