<script lang="ts">
	import { getSchedules } from '$lib/main.remote';
	import { importer } from '$lib/stores/importer.svelte';
	import { replaceState } from '$app/navigation';
	import Button from '$lib/components/Button.svelte';
	import { page } from '$app/state';
	import { CalendarCog, Rss, SquarePen } from 'lucide-svelte';

	let { children } = $props();

	const currentScheduleId = $derived(page.params.id ?? importer.importedId);
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
					<ul class="flex flex-col gap-1">
						<!-- TODO: address aria-current="page" -->
						<li class="w-full">
							<a
								href="/"
								class="aria-[current=page]:bg-zinc-300/45 aria-[current=page]:text-zinc-800 active:bg-zinc-300/45 hover:bg-zinc-300/25 text-zinc-600 block rounded-lg py-2 px-3"
								onclick={() => {
									importer.reset();
									replaceState('/', {});
								}}
								aria-current={currentScheduleId == null ? 'page' : null}
							>
								<span class="flex gap-2 items-center">
									<SquarePen size="1.2rem" aria-hidden /> Add schedule
								</span>
							</a>
						</li>
						{#each await getSchedules() as { title, id, published } (id)}
							<li>
								<a
									class="aria-[current=page]:bg-zinc-300/45 aria-[current=page]:text-zinc-800 active:bg-zinc-300/45 hover:bg-zinc-300/25 text-zinc-600 block rounded-lg py-2 px-3"
									href="/schedule/{id}"
									aria-current={currentScheduleId == id ? 'page' : null}
								>
									<span class="flex gap-2 items-center justify-between">
										{title}
										{#if published}
											<Rss size="1.2rem" aria-label="Published" class="text-zinc-600" />
										{/if}
									</span>
								</a>
							</li>
						{/each}
					</ul>
				</nav>
			</svelte:boundary>

			<div class="flex-1 flex flex-col justify-end">
				<Button href={`webcal://${page.url.host}/calendar.ics`}>
					<span class="flex gap-2 items-center">
						Subscribe to Calendar <CalendarCog size="1.2rem" aria-hidden />
					</span>
				</Button>
			</div>
		</div>
	</aside>

	<main class="flex-1">{@render children()}</main>
</div>
