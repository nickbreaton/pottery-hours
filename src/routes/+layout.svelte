<script lang="ts">
	import { getSchedules } from '$lib/main.remote';
	import '../app.css';
	import { importer } from '$lib/stores/importer.svelte';
	import { replaceState } from '$app/navigation';
	import Button from '$lib/components/Button.svelte';
	import { page } from '$app/state';
	import { CalendarArrowDown } from 'lucide-svelte';

	let { children } = $props();
</script>

<div class="flex">
	<aside class="w-64 bg-zinc-100 p-4 overflow-hidden sticky top-0 h-dvh">
		<div class="flex flex-col h-full">
			<div
				class="absolute pointer-events-none right-0 -left-5 -top-5 -bottom-5 inset-shadow-sm inset-shadow-zinc-300/75"
			></div>
			<svelte:boundary>
				{#snippet pending()}
					<!-- ignore? -->
				{/snippet}
				<nav>
					<ul>
						<!-- TODO: address aria-current="page" -->
						<li>
							<a
								href="/"
								onclick={() => {
									importer.reset();
									replaceState('/', {});
								}}
							>
								New schedule
							</a>
						</li>
						{#each await getSchedules() as { id, published } (id)}
							<li>
								<a href="/schedule/{id}">Schedule {id} ({published ? 'Published' : 'Draft'})</a>
							</li>
						{/each}
					</ul>
				</nav>
			</svelte:boundary>

			<div class="flex-1 flex flex-col justify-end">
				<Button href={`webcal://${page.url.host}/calendar.ics`}>
					<span class="flex gap-2 items-center">
						Subscribe to Calendar <CalendarArrowDown size="1.2rem" aria-hidden />
					</span>
				</Button>
			</div>
		</div>
	</aside>

	<main class="flex-1">{@render children()}</main>
</div>
