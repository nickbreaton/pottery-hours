<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		children: Snippet;
		disabled?: boolean;
		title?: string;
		icon?: boolean;
		onclick?: (event: Event) => void;
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
	  grid place-items-center border border-border-subtle text-text-primary bg-surface-card rounded-md cursor-pointer h-10 px-5 text-sm font-medium select-none
		active:bg-surface-active active:border-text-soft
		data-icon:aspect-square data-icon:p-0 data-icon:text-text-primary
		data-[prominence=prominent]:border-none data-[prominence=prominent]:bg-linear-to-tl data-[prominence=prominent]:from-accent-start data-[prominence=prominent]:to-accent-end data-[prominence=prominent]:text-white
		disabled:bg-surface-disabled disabled:border-border-subtle disabled:text-text-soft disabled:data-icon:text-text-soft disabled:cursor-default disabled:shadow-none
	"
>
	{@render children()}
</svelte:element>
