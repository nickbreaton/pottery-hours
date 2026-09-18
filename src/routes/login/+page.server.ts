import { AuthRepo } from '$lib/server/AuthRepo';
import { runtime } from '$lib/server/runtime';
import type { Actions } from './$types';
import { redirect } from '@sveltejs/kit';

export const actions = {
	default: async ({ request, cookies, url }) => {
		const formData = await request.formData();
		const secret = formData.get('password')?.toString();

		const isValid = await runtime.runPromise(AuthRepo.use((repo) => repo.validate(secret)));

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
	}
} satisfies Actions;
