import { Effect, Stream } from 'effect';
import { AiLanguageModel, AiInput } from '@effect/ai';
import { ScheduleDay } from './schema';
import { JsonStreamParser } from './JsonStreamParser';
import dedent from 'dedent';
import { AnthropicLanguageModel } from '@effect/ai-anthropic';

const genericContext = dedent`
	This is a PDF representation of a pottery studio schedule for open hours.
	It's organized into blocks of time for a given day.
	There can sometimes be multiple blocks of time per day.

	Only entries for dates that have hours defined should be included in the result.
	Each week also has a description in the left column which should be included in the results.

	When parsing, ensure the JSON format provided is followed exactly.
	Do not add any additional text or information. Do not make up data that's not in the PDF.
`;

export class ScheduleAnalyzer extends Effect.Service<ScheduleAnalyzer>()('ScheduleAnalyzer', {
	dependencies: [
		AnthropicLanguageModel.layer({
			model: 'claude-3-5-haiku-20241022',
			config: { max_tokens: 8192 }
		})
	],
	effect: Effect.gen(function* () {
		const model = yield* AiLanguageModel.AiLanguageModel;

		const makeFileInput = (file: File) =>
			Effect.gen(function* () {
				return AiInput.FilePart.make({
					mediaType: 'application/pdf',
					data: yield* Effect.promise(() => file.bytes())
				});
			});

		return {
			getDaysForWeek: Effect.fn(function* (file: File, week: number) {
				const prompt = AiInput.UserMessage.make({
					parts: [
						yield* makeFileInput(file),
						AiInput.TextPart.make({
							text: dedent`
								${genericContext}

								Parse this document and return in a JSON format for the hours for each day.
								Provide results only for week ${week}. If that week contains not results, return an empty array.

								Here is an example of the JSON format:

								[ { "month": "January", "day": 1, "label": "Winter Session", "hours": [ { "start_hour": 9, "start_minute": 0, "start_meridiem": "AM", "end_hour": 2, "end_minute": 0, "end_meridiem": "PM" } ] } ]
							`
						})
					]
				});

				return model.streamText({ prompt }).pipe(
					Stream.map((response) => response.text),
					Stream.transduce(JsonStreamParser.makeSink(ScheduleDay)),
					Stream.flattenChunks
				);
			})
		};
	})
}) {}
