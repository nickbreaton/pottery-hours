<script lang="ts">
	import type { Snippet } from 'svelte';
	import Modal from './base/Modal.svelte';
	import { CornerDownRight, CornerRightDown, MoveRight } from 'lucide-svelte';

	let { children }: { children: Snippet<[{ open: () => void }]> } = $props();
	let modal: Modal;

	let valid = $state(false);
</script>

{@render children({ open: () => modal.open() })}

<Modal bind:this={modal}>
	<div class="space-y-8">
		<section class="space-y-2">
			<h2 class="text-2xl font-semibold">New schedule</h2>
			<p class="text-gray-500 font-light text-base leading-tight">
				Provide a Google Spreadsheet URL to get started importing your schedule.
			</p>
			<form
				class="flex flex-col gap-2"
				oninput={(event) => (valid = event.currentTarget.checkValidity())}
			>
				<label for="sheet-url" class="sr-only">Google Spreadsheet URL</label>
				<textarea
					id="sheet-url"
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
