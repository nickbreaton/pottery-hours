import {
	Array,
	Effect,
	Schema,
	Stream,
	Chunk,
	ParseResult,
	DateTime,
	Schedule,
	Duration,
	Layer
} from 'effect';
import { AiLanguageModel, AiInput } from '@effect/ai';
import { ScheduleDay } from '../schema';
import { JsonStreamParser } from './JsonStreamParser';
import { OpenAiLanguageModel } from '@effect/ai-openai';
import dedent from 'dedent';
import { AnthropicLanguageModel } from '@effect/ai-anthropic';
import { FileSystem } from '@effect/platform';

// Important so that we don't make way too many requests to the Anthropic
const MAX_WEEKS = 18;

const GENERIC_CONTEXT = dedent`
	This is a PDF representation of a pottery studio schedule for open studio hours.
	It's organized into blocks of time for a given day.
	There can sometimes be multiple blocks of time per day.

	Dates always appear above the box containing the hours.

	Only entries for dates that have hours defined should be included in the result.
	Do NOT include any dates that do not have hours defined,
	this typically means the studio is closed which is not relevant to us.

	When parsing, ensure the JSON format provided is followed exactly.
	Do not add any additional text or information. DO NOT MAKE UP DATA WHICH DOES NOT APPEAR IN THE PDF.
`;

export class ScheduleAnalyzer extends Effect.Service<ScheduleAnalyzer>()('ScheduleAnalyzer', {
	dependencies: [
		AnthropicLanguageModel.layer({
			model: 'claude-3-5-sonnet-latest'
		})
		// AnthropicLanguageModel.layer({
		// 	model: 'claude-4-sonnet-20250514'
		// })
		// OpenAiLanguageModel.layer({
		// 	model: 'gpt-4'
		// })
	],
	effect: Effect.gen(function* () {
		const model = yield* AiLanguageModel.AiLanguageModel;
		const currentYear = DateTime.getPart('year')(yield* DateTime.now);

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

							DO NOT INCLUDE ANY OTHER TEXT IN THE RESPONSE OTHER THAN JSON.
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
								Provide results only for week ${week}. If that week contains no results, return an empty array.

								Each week also has a description in the left column which should be included in the results.
								Sometimes a more detailed description is provided in the box itself. Do not include times in the label.
								If there is no description, use the title of the sheet as fallback - keeping it as brief as possible, ideally under 4 words.
								Use only a singular fallback label. Typically its best to indicate "Open Studio" or similar with the label.

								Here is an example of the JSON format. Remember include absolutely no additional text or information. DO NOT FORMAT LIKE MARKDOWN.

								[
									{ "month": "January", "day": 1, "year": ${currentYear}, "label": "Winter Session", "hours": [ { "start_hour": 9, "start_minute": 0, "start_meridiem": "AM", "end_hour": 2, "end_minute": 0, "end_meridiem": "PM" } ] },
									{ "month": "January", "day": 2, "year": ${currentYear}, "label": "Winter Session", "hours": [ { "start_hour": 9, "start_minute": 0, "start_meridiem": "AM", "end_hour": 2, "end_minute": 0, "end_meridiem": "PM" }, { "start_hour": 5, "start_minute": 0, "start_meridiem": "PM", "end_hour": 6, "end_minute": 30, "end_meridiem": "PM" } ] },
									{ "month": "January", "day": 3, "year": ${currentYear}, "label": "Winter Session", "hours": [ { "start_hour": 9, "start_minute": 0, "start_meridiem": "AM", "end_hour": 2, "end_minute": 0, "end_meridiem": "PM" } ] },
								]

								DO NOT INCLUDE THE DATE IF THERE ARE NO HOURS DEFINED.
								BE SUPER SURE TO INCLUDE MULTIPLE SETS OF HOURS IF APPLICABLE. THIS IS REALLY REALLY IMPORTANT.
								THESE HOUR SLOTS ARE TYPICALLY STACKED VERTICALLY. ITS VERY RARE TO HAVE MORE THAN TWO SLOTS.
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
			getSchedule: (fileData: Uint8Array) =>
				Effect.gen(function* () {
					const filePart = AiInput.FilePart.make({
						mediaType: 'application/pdf',
						data: fileData
					});

					const { weeks } = yield* getNumberOfWeeks(filePart);

					const streams = Array.range(1, weeks).map((week) => {
						return getDaysForWeek(filePart, week);
					});

					return Stream.mergeAll({ concurrency: 'unbounded' })(streams);
				}).pipe(Stream.unwrap)
		};
	})
}) {
	static DevelopmentMock = Layer.effect(
		ScheduleAnalyzer,
		Effect.gen(function* () {
			const fs = yield* FileSystem.FileSystem;

			return ScheduleAnalyzer.make({
				getSchedule: () =>
					fs.readFile('mocks/ScheduleAnalyzer/default.json').pipe(
						Effect.tap(() => Effect.log('Fetching mock response from file system')),
						Effect.andThen((file) => new TextDecoder().decode(file)),
						Effect.andThen(Schema.decodeUnknown(Schema.parseJson(Schema.Array(ScheduleDay)))),
						Effect.orDie,
						Stream.fromIterableEffect,
						Stream.schedule(
							Schedule.recurs(Infinity).pipe(
								Schedule.delayed(() => Duration.millis(25 + Math.random() * 200))
							)
						)
					)
			});
		})
	);
}
