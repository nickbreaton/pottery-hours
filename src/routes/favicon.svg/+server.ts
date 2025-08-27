import type { RequestHandler } from '@sveltejs/kit';
import { render } from 'svelte/server';
import { BottleWine } from 'lucide-svelte';

export const prerender = true;

export const GET: RequestHandler = ({}) => {
	const { body } = render(BottleWine, {
		props: { color: '#c27aff' }
	});
	return new Response(body, {
		headers: { 'Content-Type': 'image/svg+xml' }
	});
};
