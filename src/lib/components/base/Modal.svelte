<script lang="ts">
	import { onMount, type Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	let dialog: HTMLDialogElement;

	export function open() {
		dialog.showModal();
	}

	onMount(open);
</script>

<dialog
	bind:this={dialog}
	class="mx-auto my-20 w-lg max-w-full min-h-96 outline-none rounded-lg p-5 shadow-lg backdrop:bg-gray-500/50 backdrop:backdrop-blur-[2px]"
>
	{@render children()}
</dialog>
