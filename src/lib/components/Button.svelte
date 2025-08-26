<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		children: Snippet;
		disabled?: boolean;
		title?: string;
		icon?: boolean;
		onclick?: () => void;
		href?: string;
		prominence?: 'prominent' | 'normal';
	};

	let { href, children, disabled, title, icon, onclick, prominence = 'normal' }: Props = $props();
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<svelte:element
	this={href ? 'a' : 'button'}
	{disabled}
	{title}
	{onclick}
	{href}
	data-icon={icon}
	data-prominence={prominence}
	class="
	  grid place-items-center border border-zinc-200 text-zinc-700 bg-white/80 rounded-md cursor-pointer h-10 px-5 text-sm font-medium select-none
		active:bg-zinc-200 active:border-zinc-300
		data-icon:aspect-square data-icon:p-0 data-icon:text-zinc-600
		data-[prominence=prominent]:border-none data-[prominence=prominent]:bg-linear-to-tl data-[prominence=prominent]:from-purple-600 data-[prominence=prominent]:to-purple-400 data-[prominence=prominent]:text-white
		disabled:bg-transparent disabled:text-zinc-300 disabled:data-icon:text-zinc-300 disabled:cursor-default
	"
>
	{@render children()}
</svelte:element>
