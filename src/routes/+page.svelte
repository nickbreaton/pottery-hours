<script lang="ts">
	import { runtime } from '$lib/client/runtime';
	import Logo from '$lib/components/Logo.svelte';
	import { ScheduleDay } from '$lib/schema';
	import { HttpBody, HttpClient } from '@effect/platform';
	import { Console, Effect, Schema, Stream, Chunk } from 'effect';
</script>

<div class="space-y-6 sm:space-y-10">
	<div class="flex justify-between gap-3">
		<div class="space-y-2">
			<h1 class="max-w-xs scroll-m-20 text-3xl font-bold tracking-tight text-balance sm:max-w-lg">
				Pottery Calendar Assistant
			</h1>

			<p class="text-muted-foreground max-w-md">
				Thud, whirr, clink... I’ve fired a calendar feed for you from the latest
				Oddessy&nbsp;ClassWorks schedules.
			</p>
		</div>

		<div class="relative w-32 sm:shrink-0">
			<Logo
				class="text-accent-foreground absolute w-full shrink-0 translate-x-[8%] translate-y-2 scale-120 rotate-[4deg] sm:-translate-y-3 sm:scale-110"
			/>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-4">
		<div class="space-y-2">
			<!-- <button>View Schedule</button> -->
			<div class="flex justify-between">
				<h2 class="text-2xl font-bold tracking-tight text-balance">Schedule</h2>
			</div>
			<div class="flex items-start justify-between gap-4">
				<section class="bg-card min-h-[500px] grow rounded-lg border p-4 shadow">
					<nav class="flex justify-between">
						<span>This is the calendar, controls go here...</span>
						<button
							class="bg-primary text-primary-foreground cursor-pointer items-stretch rounded-md px-2 py-1 text-sm font-medium"
						>
							Add to your calendar
						</button>
					</nav>
				</section>
			</div>
		</div>
		<form
			hidden
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
						'file:text-foreground placeholder:text-muted-foreground dark:bg-input/30 border-input bg-card flex h-9 w-full min-w-0 rounded-sm border px-3 py-6 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
						'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
						'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive'
					]}
				/>
				<button type="submit">Submit</button>
			</div>
		</form>
	</div>
</div>
