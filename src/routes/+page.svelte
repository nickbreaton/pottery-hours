<script lang="ts">
	import { runtime } from '$lib/client/runtime';
	import { ScheduleDay } from '$lib/schema';
	import { HttpBody, HttpClient } from '@effect/platform';
	import { Console, Effect, Schema, Stream, Chunk } from 'effect';
</script>

<div class="space-y-4">
	<div class="space-y-2">
		<h1
			class="max-w-xs scroll-m-20 text-3xl font-extrabold tracking-tight text-balance sm:max-w-lg"
		>
			Pottery Calendar Assistant
		</h1>

		<p class="text-muted-foreground max-w-md">
			Add a link to the Google Sheet with your pottery schedule and I’ll help add it to your
			calendar.
		</p>
	</div>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
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
			<div class="flex gap-4">
				<input
					type="text"
					name="url"
					placeholder="https://docs.google.com/spreadsheets/d/..."
					value="https://docs.google.com/spreadsheets/d/1Zh5blbFTgcDrdcQbswhbvtJFKRqepMPlNDcPK6K05bY/edit?pli=1&gid=0#gid=0"
					class={[
						'file:text-foreground placeholder:text-muted-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
						'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
						'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive'
					]}
				/>
				<button type="submit">Submit</button>
			</div>
		</form>
	</div>
</div>
