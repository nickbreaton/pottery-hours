<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<div class="mx-auto max-w-4xl px-6 py-6 sm:py-12">
	{@render children()}
</div>
