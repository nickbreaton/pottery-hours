import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { netlifyCompat } from './src/vite/plugin-netlify-compat';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), netlifyCompat()]
});
