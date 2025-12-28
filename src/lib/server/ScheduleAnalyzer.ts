import { LanguageModel, Prompt } from '@effect/ai';
import { OpenRouterLanguageModel } from '@effect/ai-openrouter';
import { FetchHttpClient } from '@effect/platform';
import dedent from 'dedent';
import { Console, DateTime, Effect, Option, Stream } from 'effect';
import { JsonStreamParser } from './JsonStreamParser';
import { ScheduleDay } from './schema';

export class ScheduleAnalyzer extends Effect.Service<ScheduleAnalyzer>()('ScheduleAnalyzer', {
	dependencies: [
		OpenRouterLanguageModel.layer({
			model: 'anthropic/claude-haiku-4.5'
		}),
		FetchHttpClient.layer
	],
	effect: Effect.gen(function* () {
		const model = yield* LanguageModel.LanguageModel;
		const currentDate = yield* DateTime.now;
		const currentYear = DateTime.getPart('year')(currentDate);
		const currentMonth = DateTime.format({ month: 'long' })(currentDate);

		return {
			analyze: (fileData: Uint8Array) => {
				const instructions = dedent`
				  You are an assistant which can parse a pottery studio schedule, outputting that schedule in a JSON format.

          A PDF representation of a pottery studio schedule will be provided to you. This schedule designates open studio hours.
          Its original form is a spreadsheet laid out as a calendar weeks starting Sunday and ending on Saturday.
          Each day with available hours is represented by a box with a time range.

          ## Date and Year Rules

          * The current date is ${currentMonth} ${currentYear}.
          * Look for explicitly displayed years in the document (e.g., "January 2025", "2025 Schedule").
          * Use the explicit year shown for any month where a year is displayed.
          * For months without an explicit year, infer based on:
            * The explicit years shown elsewhere in the document
            * The logical sequence of months (schedules are always forward-looking and contiguous)
          * If a schedule spans a year boundary (e.g., December to February), December belongs to the year BEFORE January.
          * DO NOT assume the schedule starts in the past unless the document explicitly shows a past year.

          ## Content Rules

          * Only include dates that have hours explicitly defined in a box.
          * If a day shows "Closed" without any hours, omit it entirely.
          * DO NOT infer times - if there are no hours in a box, skip that day.
          * There can be multiple time blocks per day, but rarely more than two.

          ## Label Rules

          * Use information within the hours box as the label, excluding the hours themselves.
          * Each week may have a label in the left column - use this to enhance the day's label.
          * If no label exists, use "Open Studio Hours" as the default.
          * Keep labels concise.
          * Every day in the output must have a label.
          * Labels won't be in a separate box from the hours; if text is in a separate box, it's not relevant to that day.

          ## Output Rules

          * Return ONLY valid JSON with no additional text, markdown formatting, or explanation.
          * DO NOT MAKE UP DATA WHICH DOES NOT APPEAR IN THE PDF.

          Example format:
          [
            { "month": "January", "day": 1, "year": 2000, "label": "Description within the box", "hours": [ { "start_hour": 9, "start_minute": 0, "start_meridiem": "AM", "end_hour": 2, "end_minute": 0, "end_meridiem": "PM" } ] },
            { "month": "January", "day": 2, "year": 2000, "label": "Winter Session", "hours": [ { "start_hour": 9, "start_minute": 0, "start_meridiem": "AM", "end_hour": 2, "end_minute": 0, "end_meridiem": "PM" }, { "start_hour": 5, "start_minute": 0, "start_meridiem": "PM", "end_hour": 6, "end_minute": 30, "end_meridiem": "PM" } ] }
          ]
				`;

				const prompt = Prompt.make([
					{
						role: 'user',
						content: [
							{ type: 'text', text: instructions },
							{ type: 'file', data: fileData, mediaType: 'application/pdf' }
						]
					}
				]);

				return model.streamText({ prompt }).pipe(
					Stream.filterMap((response) =>
						response.type === 'text-delta' ? Option.some(response.delta) : Option.none()
					),
					Stream.mapAccum(false, (hasReceivedJson, token) => {
						if (hasReceivedJson) return [true, token];
						if (token.includes('[')) return [true, token];
						return [false, ''];
					}),
					Stream.map((token) => token.replace('```', '')),
					Stream.tapError(Console.error),
					Stream.transduce(JsonStreamParser.makeSink(ScheduleDay)),
					Stream.tapError((error) => Console.error('Stream error', error)),
					Stream.flattenChunks
				);
			}
		};
	})
}) {}
