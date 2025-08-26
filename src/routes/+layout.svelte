<script lang="ts">
	import { getSchedules } from '$lib/main.remote';
	import '../app.css';
	import { importer } from '$lib/stores/importer.svelte';
	import { replaceState } from '$app/navigation';

	let { children } = $props();
</script>

<div class="flex">
	<aside class="max-w-72 bg-zinc-100 p-4 overflow-hidden sticky top-0 h-screen">
		<div>
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
		</div>
	</aside>

	<main class="flex-1">{@render children()}</main>
</div>
