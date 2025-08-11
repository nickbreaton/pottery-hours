<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<aside>
	<nav>
		<ul>
			<li><a aria-current="page" href="/">New Schedule</a></li>
			{#each [0, 1, 2] as row}
				<li>
					<a href="/schedule/{row}">Schedule {row}</a>
				</li>
			{/each}
		</ul>
	</nav>
</aside>

<main>{@render children()}</main>
