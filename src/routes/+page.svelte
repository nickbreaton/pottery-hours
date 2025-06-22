<script lang="ts">
	import { runtime } from '$lib/client/runtime';
	import { ScheduleDay } from '$lib/schema';
	import { HttpBody, HttpClient } from '@effect/platform';
	import { Console, Effect, Schema, Stream, Chunk } from 'effect';
</script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>

<form
	method="POST"
	onsubmit={async (event) => {
		event.preventDefault();

		const res = await HttpClient.post(event.currentTarget.action, {
			body: HttpBody.formData(new FormData(event.currentTarget))
		}).pipe(
			Effect.andThen((res) => res.stream),
			Stream.unwrap,
			Stream.map((text) => new TextDecoder().decode(text)),
			Stream.mapEffect(Schema.decodeUnknown(Schema.parseJson(ScheduleDay))),
			Stream.tap(Console.log),
			Stream.runCollect,
			Effect.andThen(Chunk.toArray),
			runtime.runPromise
		);

		console.log('complete', res);
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
