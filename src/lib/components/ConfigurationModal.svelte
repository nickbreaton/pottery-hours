<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import Modal from './base/Modal.svelte';
	import { CornerDownRight, CornerRightDown, MoveRight } from 'lucide-svelte';
	import { RpcClient, RpcSerialization } from '@effect/rpc';
	import { Console, Effect, Layer, Stream } from 'effect';
	import { FetchHttpClient } from '@effect/platform';
	import { UserRpcs } from '$lib/rpc';
	import { runtime } from '$lib/client/runtime';

	let { children }: { children: Snippet<[{ open: () => void }]> } = $props();
	let modal: Modal;

	let valid = $state(false);

	onMount(() => {
		// Choose which protocol to use
		const ProtocolLive = RpcClient.layerProtocolHttp({
			url: '/api/rpc'
		}).pipe(Layer.provide([FetchHttpClient.layer, RpcSerialization.layerNdjson]));

		// Use the client
		const program = Effect.gen(function* () {
			const client = yield* RpcClient.make(UserRpcs);
			yield* Stream.runForEach(client.UserList(), (user) => Console.log(user));
		}).pipe(Effect.scoped);

		runtime.runPromise(program.pipe(Effect.provide(ProtocolLive)));
	});
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

					const response = await fetch('/api/import', {
						method: 'POST',
						body: JSON.stringify({
							url:
								new FormData(event.currentTarget).get('url') ||
								'https://docs.google.com/spreadsheets/d/1lAC9Kw9sTuaOcvRHznlWlsMZ2RyenqnBY74fbQyoY9c/edit?gid=0#gid=0'
						})
					});

					const reader = response.body!.getReader();

					await reader.read().then(function pump({ done, value }): any {
						if (done) {
							// Do something with last chunk of data then exit reader
							return;
						}
						// Otherwise do something here to process current chunk
						console.log(new TextDecoder().decode(value));
						// Read some more, and call this function again
						return reader.read().then(pump);
					});
				}}
			>
				<label for="sheet-url" class="sr-only">Google Spreadsheet URL</label>
				<textarea
					id="sheet-url"
					name="url"
					class="resize-none placeholder:text-gray-400 p-3 w-full rounded bg-gray-50 border border-gray-300 focus:outline-accent-300 focus:outline-3"
					placeholder="https://docs.google.com/spreadsheets/d/...."
					rows={3}
					required
				></textarea>
				<div class="flex justify-end">
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

		<!-- <section class="space-y-2">
			<h2 class="text-2xl font-semibold">Existing schedules</h2>
			<p class="text-gray-500 font-light text-base leading-tight">
				All known schedules are listed below.
			</p>
		</section> -->
	</div>
</Modal>
