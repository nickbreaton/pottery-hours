<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
</script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>

<form
	method="POST"
	enctype="multipart/form-data"
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
	<input type="file" name="file" accept=".pdf" class="border" />
	<button type="submit">Submit</button>
</form>
