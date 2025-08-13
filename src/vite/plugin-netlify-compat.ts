import type { Plugin } from 'vite';

export const netlifyCompat = (): Plugin => ({
	name: 'netlify-compat',
	config: () => {
		if (!process.env.NETLIFY) {
			return {};
		}

		return {
			resolve: {
				alias: {
					'@effect/platform-node': 'noop'
				}
			}
		};
	}
});
