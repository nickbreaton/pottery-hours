<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import Modal from './base/Modal.svelte';
	import {
		CornerDownRight,
		CornerRightDown,
		ExternalLink,
		MoveRight,
		Trash,
		Trash2
	} from 'lucide-svelte';
	import { RpcClient, RpcSerialization } from '@effect/rpc';
	import { Console, Effect, Layer, Stream } from 'effect';
	import { FetchHttpClient } from '@effect/platform';
	import { ImportRpcs } from '$lib/rpc/schema';
	import { runtime } from '$lib/client/runtime';
	import { invalidateAll } from '$app/navigation';

	type Props = {
		children: Snippet<[{ open: () => void }]>;
		schedules: Array<{ id: string; label: string; url: string }>;
	};

	let { children, schedules }: Props = $props();
	let modal: Modal;

	let valid = $state(false);
	let error = $state<string | null>(null);
</script>

{@render children({ open: () => modal.open() })}

<Modal bind:this={modal}>
	<div class="space-y-8">
		<section class="space-y-2">
			<h2 class="text-2xl font-semibold">Add new schedule</h2>
			<p class="text-gray-500 font-light text-base leading-tight">
				Provide a Google Spreadsheet URL to get started importing your schedule.
			</p>
			<form
				class="flex flex-col gap-2"
				oninput={(event) => (valid = event.currentTarget.checkValidity())}
				onsubmit={async (event) => {
					event.preventDefault();

					runtime.runPromise(
						Effect.gen(function* () {
							const client = yield* RpcClient.make(ImportRpcs);
							yield* client
								.ParseSpreadsheet({ url: new FormData(event.currentTarget).get('url') as string })
								.pipe(
									Stream.onDone(() =>
										Effect.sync(() => {
											modal.close();
											invalidateAll();
										})
									),
									Stream.tapError((message) => {
										return Effect.sync(() => {
											error = message;
										});
									}),
									Stream.runForEach(Console.log)
								);
						}).pipe(Effect.scoped)
					);
				}}
			>
				<label for="sheet-url" class="sr-only">Google Spreadsheet URL</label>
				<textarea
					id="sheet-url"
					name="url"
					class="resize-none placeholder:text-gray-400 p-3 w-full rounded bg-gray-50 border border-gray-300 focus:outline-accent-300 focus:outline-3"
					placeholder="https://docs.google.com/spreadsheets/d/..."
					rows={3}
					required
				></textarea>
				<div class="flex justify-between items-center">
					<p class="text-red-500">{error}</p>
					<button
						type="submit"
						disabled={!valid}
						class="bg-accent py-1.5 px-4 text-white rounded text-sm cursor-pointer in-invalid:opacity-50 flex items-center gap-2"
					>
						Import schedule <MoveRight size="1em" strokeWidth={3} />
					</button>
				</div>
			</form>
		</section>

		{#if schedules.length > 0}
			<section class="space-y-3">
				<h2 class="text-2xl font-semibold">Existing schedules</h2>

				<div class="space-y-2">
					{#each schedules as schedule}
						<article class="grid grid-cols-[1fr_auto] gap-2 items-center">
							<p class="text-base font-light leading-tight">{schedule.label}</p>
							<div class="flex gap-2">
								<a aria-label="Open" href={schedule.url} class="text-gray-900" target="_blank">
									<ExternalLink size="1.25em" />
								</a>
								<button
									aria-label="Delete"
									class="text-red-600 cursor-pointer"
									onclick={() => {
										// TODO: actually delete
									}}
								>
									<Trash2 size="1.25em" />
								</button>
							</div>
						</article>
					{/each}
				</div>
			</section>
		{/if}
	</div>
</Modal>
