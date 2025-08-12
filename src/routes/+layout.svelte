<script lang="ts">
	import { getSchedules } from '$lib/main.remote';
	import '../app.css';

	let { children } = $props();
</script>

<aside>
	<svelte:boundary>
		{#snippet pending()}
			<!-- ignore? -->
		{/snippet}
		<nav>
			<ul>
				<li><a aria-current="page" href="/">New Schedule</a></li>
				{#each await getSchedules() as { id, published } (id)}
					<li>
						<a href="/schedule/{id}">Schedule {id} ({published ? 'Published' : 'Draft'})</a>
					</li>
				{/each}
			</ul>
		</nav>
	</svelte:boundary>
</aside>

<main>{@render children()}</main>
