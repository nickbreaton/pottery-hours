<script lang="ts">
	import { deleteSchedule, getSchedule, getSchedules, setSchedulePublished } from '$lib/main.remote';
	import type { PageProps } from './$types';

	let { params }: PageProps = $props();
</script>

<svelte:boundary>
	{#snippet pending()}<p>Loading...</p>{/snippet}

	{#snippet failed()}
		<p>Something went wrong loading schedule</p>
	{/snippet}

	{@render contents()}
</svelte:boundary>

{#snippet contents()}
	{@const schedule = await getSchedule(params.id)}

	<form {...deleteSchedule}>
		<input type="hidden" name="id" value={params.id} />
		<button type="submit">Delete</button>
	</form>

	<button
		onclick={async () => {
			const next = !schedule.published;

			const overrides = [
				getSchedule(params.id).withOverride((existing) => {
					return { ...existing, published: next };
				}),
				getSchedules().withOverride((schedules) => {
					return schedules.map((schedule) => (schedule.id === params.id ? { ...schedule, published: next } : schedule));
				})
			];

			await setSchedulePublished({ id: params.id, published: next }).updates(...overrides);
		}}
	>
		{schedule.published ? 'Unpublish' : 'Publish'}
	</button>

	<pre>{JSON.stringify(schedule, null, 4)}</pre>
{/snippet}
