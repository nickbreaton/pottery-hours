<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
</script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>

<form
	method="POST"
	onsubmit={async (event) => {
		event.preventDefault();

		const response = await fetch(event.currentTarget.action, {
			method: 'POST',
			body: new FormData(event.currentTarget)
		});

		response.body?.pipeThrough(new TextDecoderStream()).pipeTo(
			new WritableStream({
				write(chunk) {
					console.log(chunk);
				}
			})
		);
	}}
>
	<div>Upload a PDF copy</div>
	<input
		type="text"
		name="url"
		value="https://docs.google.com/spreadsheets/d/1Zh5blbFTgcDrdcQbswhbvtJFKRqepMPlNDcPK6K05bY/edit?pli=1&gid=0#gid=0"
		class="border"
	/>
	<button type="submit">Submit</button>
</form>
