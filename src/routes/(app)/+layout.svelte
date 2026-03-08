<script lang="ts">
	import { getSchedules } from '$lib/main.remote';
	import { importer } from '$lib/stores/importer.svelte';
	import { replaceState } from '$app/navigation';
	import Button from '$lib/components/Button.svelte';
	import { page, navigating } from '$app/state';
	import { CalendarCog, Rss, SquarePen } from 'lucide-svelte';
	import MenuControl, { menu } from '$lib/components/MenuControl.svelte';
	import { disableBodyScroll, enableBodyScroll } from 'body-scroll-lock';

	let { children } = $props();
	let aside: HTMLElement;

	const currentScheduleId = $derived(page.params.id ?? importer.importedId);

	$effect(() => {
		menu.open ? disableBodyScroll(aside) : enableBodyScroll(aside);
	});

	$effect(() => {
		navigating.complete?.then(() => {
			menu.open = false;
		});
	});
</script>

<div class="flex group">
	<aside
		bind:this={aside}
		data-open={menu.open ? '' : null}
		class="
	  	  hidden sm:flex w-full flex-col sm:w-64 bg-surface-muted p-3 overflow-hidden sticky top-0 h-dvh z-10
	  		max-sm:p-6 max-sm:data-open:flex max-sm:data-open:fixed max-sm:data-open:shadow-lg shadow-edge-shadow
     "
	>
		<div class="flex flex-col h-full">
			<div
				class="max-sm:hidden absolute pointer-events-none right-0 -left-5 -top-5 -bottom-5 inset-shadow-sm inset-shadow-edge-shadow-soft"
			></div>
			<nav class="flex flex-col">
				<div class="flex sm:hidden self-end pb-5">
					<MenuControl direction="close" />
				</div>
				<ul class="flex flex-col gap-1">
					<!-- TODO: address aria-current="page" -->
					<li class="w-full">
						<a
							href="/"
							class="aria-[current=page]:bg-surface-active aria-[current=page]:text-text-strong active:bg-surface-active hover:bg-surface-hover text-text-primary block rounded-lg py-2 px-3"
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
								class="aria-[current=page]:bg-surface-active aria-[current=page]:text-text-strong active:bg-surface-active hover:bg-surface-hover text-text-primary block rounded-lg py-2 px-3"
								href="/schedule/{id}"
								aria-current={currentScheduleId == id ? 'page' : null}
							>
								<span class="flex gap-2 items-center justify-between">
									{title}
									{#if published}
										<Rss size="1.2rem" aria-label="Published" class="text-text-primary" />
									{/if}
								</span>
							</a>
						</li>
					{/each}
				</ul>
			</nav>

			<div class="flex-1 flex flex-col justify-end">
				<Button href={`webcal://${page.url.host}/calendar.ics`}>
					<span class="flex gap-2 items-center">
						Subscribe to Calendar <CalendarCog size="1.2rem" aria-hidden />
					</span>
				</Button>
			</div>
		</div>
	</aside>

	<main class="flex-1 bg-app-bg">{@render children()}</main>
</div>
