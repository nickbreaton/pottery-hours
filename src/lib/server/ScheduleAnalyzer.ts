import { Array, Effect, Schema, Stream, Chunk, ParseResult } from 'effect';
import { AiLanguageModel, AiInput } from '@effect/ai';
import { ScheduleDay } from './schema';
import { JsonStreamParser } from './JsonStreamParser';
import { AnthropicLanguageModel } from '@effect/ai-anthropic';
import dedent from 'dedent';

// Important so that we don't make way too many requests to the Anthropic
const MAX_WEEKS = 18;

const GENERIC_CONTEXT = dedent`
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

		const getNumberOfWeeks = Effect.fn(function* (filePart: AiInput.FilePart) {
			const prompt = AiInput.UserMessage.make({
				parts: [
					filePart,
					AiInput.TextPart.make({
						text: dedent`
							${GENERIC_CONTEXT}

							Parse this document and return in a JSON format the number of weeks that have at least one day with hours defined.
							DO NOT INCLUDE ANYTHING OTHER THAN WHATS SHOWN IN THE EXAMPLE.

							Here is an example of the JSON format:

							{ "weeks": 4 }
					`
					})
				]
			});

			const text = yield* model.streamText({ prompt }).pipe(
				// Manually collecting text from a stream as to avoid `generateText` which appears to have a bug
				Stream.runCollect,
				Effect.andThen(Chunk.map((text) => text.text)),
				Effect.andThen(Chunk.join(''))
			);

			const responseSchema = Schema.parseJson(
				Schema.Struct({ weeks: Schema.Number.pipe(Schema.lessThanOrEqualTo(MAX_WEEKS)) })
			);

			return yield* Schema.decodeUnknown(responseSchema)(text);
		});

		const getDaysForWeek = (filePart: AiInput.FilePart, week: number) => {
			const prompt = AiInput.UserMessage.make({
				parts: [
					filePart,
					AiInput.TextPart.make({
						text: dedent`
								${GENERIC_CONTEXT}

								Parse this document and return in a JSON format for the hours for each day.
								Provide results only for week ${week}. If that week contains not results, return an empty array.

								Here is an example of the JSON format:

								[
									{ "month": "January", "day": 1, "label": "Winter Session", "hours": [ { "start_hour": 9, "start_minute": 0, "start_meridiem": "AM", "end_hour": 2, "end_minute": 0, "end_meridiem": "PM" } ] },
									{ "month": "January", "day": 2, "label": "Winter Session", "hours": [ { "start_hour": 9, "start_minute": 0, "start_meridiem": "AM", "end_hour": 2, "end_minute": 0, "end_meridiem": "PM" } ] },
									{ "month": "January", "day": 3, "label": "Winter Session", "hours": [ { "start_hour": 9, "start_minute": 0, "start_meridiem": "AM", "end_hour": 2, "end_minute": 0, "end_meridiem": "PM" } ] },
								]
							`
					})
				]
			});

			return model.streamText({ prompt }).pipe(
				Stream.map((response) => response.text),
				Stream.transduce(JsonStreamParser.makeSink(ScheduleDay)),
				Stream.flattenChunks
			);
		};

		return {
			getSchedule: (file: File) =>
				Effect.gen(function* () {
					const filePart = AiInput.FilePart.make({
						mediaType: 'application/pdf',
						data: yield* Effect.promise(() => file.bytes())
					});

					const { weeks } = yield* getNumberOfWeeks(filePart);

					const streams = Array.range(1, weeks).map((week) => {
						return getDaysForWeek(filePart, week);
					});

					return Stream.mergeAll({ concurrency: 'unbounded' })(streams);
				}).pipe(Stream.unwrap)
		};
	})
}) {}
