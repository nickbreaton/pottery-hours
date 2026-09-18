import { runtime } from '$lib/server/runtime';
import { ScheduleRepo } from '$lib/server/ScheduleRepo';
import { HttpServerResponse } from 'effect/unstable/http';
import type { RequestHandler } from '@sveltejs/kit';
import { Console, Effect, Schema, Stream } from 'effect';
import { CompleteEvent, CreateEvent, DayEvent, InvalidEvent } from './schema';

export const GET: RequestHandler = ({ url }) => {
	const handler = Effect.gen(function* () {
		const repo = yield* ScheduleRepo;

		const { stream, id } = yield* repo.create(url.searchParams.get('spreadsheet')!);

		return stream.pipe(
			Stream.map((day) => DayEvent.make({ type: 'day', data: day })),
			Stream.catch((error) => Stream.succeed(InvalidEvent.make({ type: 'invalid', message: String(error) }))),
			Stream.mapEffect((event) => Schema.encodeEffect(CreateEvent)(event)),
			Stream.concat(Stream.succeed(CompleteEvent.make({ type: 'complete', id }))),
			Stream.map((data) =>
				new TextEncoder().encode([`event:${data.type}`, `data: ${JSON.stringify(data)}\n\n`].join('\n'))
			),
			Stream.tapError((x) => Console.error(x)),
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
