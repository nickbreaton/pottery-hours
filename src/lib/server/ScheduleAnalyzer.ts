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
		const currentYear = DateTime.getPart('year')(yield* DateTime.now);

		return {
			analyze: (fileData: Uint8Array) => {
				const instructions = dedent`
          You are an assistant which can parse a pottery studio schedule, outputting that schedule in a JSON format.

          A PDF representation of a pottery studio schedule will be provided to you. This schedule designates open studio hours.
          Its original form is a spreadsheet laid out as a calendar weeks starting Sunday and ending on Saturday.
          Each day with available hours is represented by a box with a time range.

          Here are some rules to keep in mind:

          * Pay special attention to the first and last date to ensure you don't miss anything.
          * There can sometimes be multiple blocks of time per day.
          * Only entries for dates that have hours defined should be included in the result.
          * Information within the hours box should be used as the label, excluding the hours themselves.
          * Each week also should have a label in the left column which can be used to enhance the label.
          * Sometimes even the week doesn't have a label, in which case just use 'Open Studio Hours' instead.
          * Try to keep the label concise.
          * Every day should have a label in the output.
          * Labels wont be in a seperate box than the hours, if it is its not relevant to that day.
          * REALLY IMPORTANT: If a day has 'Closed' as its label without any hours, thats a pretty clear indication that it should be omitted.
          * Its rare to have more than two sets of hours defined per day.
          * DO NOT infer times, if there's no hours in a box, then the day should simply be skipped.
          * Do NOT include any dates that do not have hours defined, this typically means the studio is closed which is not relevant.
          * DO NOT MAKE UP DATA WHICH DOES NOT APPEAR IN THE PDF.

          Parse the provided document and return its result in a JSON format for the hours for each day, without any additional output.
          Here is an example of the JSON format. Remember include absolutely no additional text or information. DO NOT FORMAT LIKE MARKDOWN.

					[
						{ "month": "January", "day": 1, "year": ${currentYear}, "label": "Description within the box", "hours": [ { "start_hour": 9, "start_minute": 0, "start_meridiem": "AM", "end_hour": 2, "end_minute": 0, "end_meridiem": "PM" } ] },
						{ "month": "January", "day": 2, "year": ${currentYear}, "label": "Winter Session", "hours": [ { "start_hour": 9, "start_minute": 0, "start_meridiem": "AM", "end_hour": 2, "end_minute": 0, "end_meridiem": "PM" }, { "start_hour": 5, "start_minute": 0, "start_meridiem": "PM", "end_hour": 6, "end_minute": 30, "end_meridiem": "PM" } ] },
						{ "month": "January", "day": 3, "year": ${currentYear}, "label": "Winter Session", "hours": [ { "start_hour": 9, "start_minute": 0, "start_meridiem": "AM", "end_hour": 2, "end_minute": 0, "end_meridiem": "PM" } ] },
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
