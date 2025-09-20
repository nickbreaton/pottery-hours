<script lang="ts" module>
	export const menu = $state({
		open: false
	});
</script>

<script lang="ts">
	import { TextAlignJustify, X } from 'lucide-svelte';

	type Props = {
		direction: 'open' | 'close';
	};

	let { direction }: Props = $props();
</script>

<label
	class="
	  relative text-xl rounded-full grid place-items-center cursor-pointer
    local--click-target
	"
>
	<input
		type="checkbox"
		aria-label={direction === 'open' ? 'Open menu' : 'Close menu'}
		class="sr-only"
		data-menu-control
		bind:checked={menu.open}
	/>
	{#if direction === 'open'}
		<TextAlignJustify size="1em" />
	{:else}
		<X size="1em" />
	{/if}
</label>

<style>
	.local--click-target::after {
		content: '';
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 2.5rem;
		height: 2.5rem;
	}
</style>
