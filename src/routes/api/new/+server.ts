import { runtime } from '$lib/server/runtime';
import { ScheduleRepo } from '$lib/server/ScheduleRepo';
import { HttpServerResponse } from '@effect/platform';
import type { RequestHandler } from '@sveltejs/kit';
import { Console, Effect, Schema, Stream } from 'effect';
import { CreateEvent, DayEvent, InvalidEvent, Complete } from './schema';

export const GET: RequestHandler = ({ url }) => {
	const handler = Effect.gen(function* () {
		const repo = yield* ScheduleRepo;

		return repo.create(url.searchParams.get('spreadsheet')!).pipe(
			Stream.unwrap,
			Stream.map((day) => DayEvent.make({ type: 'day', data: day })),
			Stream.catchTags({
				ParseError: (error) => Stream.succeed(InvalidEvent.make({ type: 'invalid', message: error.message }))
			}),
			Stream.flatMap(Schema.encode(CreateEvent)),
			Stream.concat(Stream.succeed(Complete.make({ type: 'complete' }))),
			Stream.map((data) =>
				new TextEncoder().encode([`event:${data.type}`, `data: ${JSON.stringify(data)}\n\n`].join('\n'))
			),
			Stream.tapError((x) => Console.error(x.cause)),
			(stream) =>
				HttpServerResponse.stream(stream, {
					contentType: 'text/event-stream',
					headers: { Connection: 'keep-alive', 'Cache-Control': 'no-cache' }
				}),
			HttpServerResponse.toWeb
		);
	});

	return runtime.runPromise(handler);
};
