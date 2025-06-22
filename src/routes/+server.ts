import { runtime } from '$lib/server/runtime';
import { Effect, Schema, Stream } from 'effect';
import { ScheduleAnalyzer } from '$lib/server/ScheduleAnalyzer';
import type { RequestHandler } from './$types';
import { URLFromSpreadsheetId } from '$lib/schema';
import { GoogleSheetsClient } from '$lib/server/GoogleSheetsClient';

export const POST: RequestHandler = async ({ request, url }) => {
	const program = Effect.gen(function* () {
		const scheduleAnalyzer = yield* ScheduleAnalyzer;
		const googleSheetsClient = yield* GoogleSheetsClient;

		const formData = yield* Effect.promise(() => request.formData());
		const spreadsheetId = yield* Schema.decodeUnknown(URLFromSpreadsheetId)(formData.get('url'));
		const spreadsheetFileData = yield* googleSheetsClient.download(spreadsheetId);

		return scheduleAnalyzer.getSchedule(spreadsheetFileData).pipe(
			Stream.map(JSON.stringify),
			Stream.tapErrorCause((error) => Effect.logError('Stream failed with error', error)),
			Stream.toReadableStream
		);
	});

	const readable = await program.pipe(
		Effect.scoped,
		Effect.withSpan('POST', { attributes: { pathname: url.pathname } }),
		runtime.runPromise
	);

	return new Response(readable);
};
