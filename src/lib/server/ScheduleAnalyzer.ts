import { DecisionModel, DecisionSchema } from '@effect-agent/ai-decision';
import { TypeSafeClient, TypeSafeDecisionModel } from '@effect-agent/ai-typesafe';
import { MONTHS } from '$lib/utils/datetime';
import { Console, Context, Data, DateTime, Effect, FileSystem, Layer, Option, Schedule, Schema, Stream } from 'effect';
import { FetchHttpClient } from 'effect/unstable/http';
import { MistralOcr, type OcrDocument } from './MistralOcr';
import { ScheduleDay } from './schema';
import { datePresenceQuestions, metadataQuestions, timeQuestions } from './schedule-analysis/questions';

const JEV_MODEL = 'jev-1.13.0';
const PRESENT_THRESHOLD = 0.6;
const COMPONENT_CHOICE_THRESHOLD = 0;
const YEAR_CHOICE_THRESHOLD = 0.5;

class ScheduleAnalysisError extends Data.TaggedError('ScheduleAnalysisError')<{
	message: string;
}> {}

type Answers = Readonly<Record<string, unknown>>;

type TimeRange = ScheduleDay['hours'][number];

const ocrState = (ocr: OcrDocument) => ({
	documentType: 'Pottery studio open-hours schedule',
	usage_info: ocr.usage_info,
	pages: ocr.pages.map((page) => ({
	  markdown: page.markdown,
		tables: page.tables ?? [],
		blocks: page.blocks ?? [],
	}))
});

const evaluate = <Q extends DecisionSchema.Questions>(
	model: DecisionModel.Service,
	state: DecisionSchema.Content,
	questions: Q
) =>
	model.evaluate({ state, questions }).pipe(
		Effect.retry({
			times: 2,
			schedule: Schedule.exponential('250 millis'),
			while: (error) => error.isRetryable
		}),
		Effect.timeout('60 seconds')
	);

const answer = (answers: Answers, id: string) => {
	const value = answers[id];
	if (value === undefined) {
		return Effect.fail(new ScheduleAnalysisError({ message: `Jev omitted answer ${id}` }));
	}
	return Schema.decodeUnknownEffect(DecisionSchema.Answer)(value).pipe(
		Effect.mapError(() => new ScheduleAnalysisError({ message: `Jev returned an invalid answer for ${id}` }))
	);
};

const probability = (answers: Answers, id: string) =>
	answer(answers, id).pipe(
		Effect.flatMap((value) =>
			value.type === 'probability'
				? Effect.succeed(value.probability)
				: Effect.fail(new ScheduleAnalysisError({ message: `Expected a probability answer for ${id}` }))
		)
	);

const choice = (answers: Answers, id: string, minimumProbability = COMPONENT_CHOICE_THRESHOLD) =>
	answer(answers, id).pipe(
		Effect.flatMap((value) => {
			if (value.type !== 'choice') {
				return Effect.fail(new ScheduleAnalysisError({ message: `Expected a choice answer for ${id}` }));
			}
			const selectedProbability = value.probabilities[value.choice];
			return selectedProbability !== undefined && selectedProbability >= minimumProbability
				? Effect.succeed(value.choice)
				: Effect.fail(
						new ScheduleAnalysisError({
							message: `Low-confidence Jev answer for ${id}: ${selectedProbability ?? 'missing'}`
						})
					);
		})
	);

const validDays = (month: (typeof MONTHS)[number], year: number) => {
	const monthIndex = MONTHS.indexOf(month);
	return Array.from({ length: 31 }, (_, index) => index + 1).filter(
		(day) => new Date(Date.UTC(year, monthIndex, day)).getUTCMonth() === monthIndex
	);
};

const chunks = <T>(items: ReadonlyArray<T>, size: number): ReadonlyArray<ReadonlyArray<T>> =>
	Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, (index + 1) * size));

const readRange = (
	answers: Answers,
	date: string,
	day: number,
	range: 'first' | 'second'
): Effect.Effect<TimeRange, ScheduleAnalysisError> =>
	Effect.gen(function* () {
		const prefix = `day_${day}_${range}`;
		const startHour = yield* choice(answers, `${prefix}_start_hour`);
		const startMinute = yield* choice(answers, `${prefix}_start_minute`);
		const startMeridiem = yield* choice(answers, `${prefix}_start_meridiem`);
		const endHour = yield* choice(answers, `${prefix}_end_hour`);
		const endMinute = yield* choice(answers, `${prefix}_end_minute`);
		const endMeridiem = yield* choice(answers, `${prefix}_end_meridiem`);
		const values = [startHour, startMinute, startMeridiem, endHour, endMinute, endMeridiem];
		console.log(values)
		if (values.includes('none') || values.includes('other')) {
			return yield* new ScheduleAnalysisError({
				message: `Jev could not resolve the ${range} time range for ${date}`
			});
		}

		return {
			start_hour: Number(startHour),
			start_minute: Number(startMinute),
			start_meridiem: startMeridiem as 'AM' | 'PM',
			end_hour: Number(endHour),
			end_minute: Number(endMinute),
			end_meridiem: endMeridiem as 'AM' | 'PM'
		};
	});

export class ScheduleAnalyzer extends Context.Service<
	ScheduleAnalyzer,
	{ readonly analyze: (fileData: Uint8Array) => Stream.Stream<ScheduleDay, unknown> }
>()('ScheduleAnalyzer', {
	make: Effect.gen(function* () {
		const ocr = yield* MistralOcr;
		const model = yield* DecisionModel.DecisionModel;
		const now = yield* DateTime.now;
		const currentYear = DateTime.getPart('year')(now);

		return {
			analyze: (fileData: Uint8Array) => {
				const analysis = Effect.gen(function* () {
					const document = yield* ocr.process(fileData);
					console.log(document); // TODO: clean up
					const state = ocrState(document);
					const metadata = yield* evaluate(model, state, metadataQuestions(currentYear));
					const months: Array<{ month: (typeof MONTHS)[number]; year: number }> = [];

					for (const month of MONTHS) {
						const present = yield* probability(metadata.answers, `month_${month}_present`);
						if (present < PRESENT_THRESHOLD) continue;

						const selectedYear = yield* choice(metadata.answers, `month_${month}_year`, YEAR_CHOICE_THRESHOLD);
						if (selectedYear === 'unknown') {
							return yield* new ScheduleAnalysisError({
								message: `Could not determine the year for ${month}`
							});
						}
						months.push({ month, year: Number(selectedYear) });
					}

					if (months.length === 0) {
						return yield* new ScheduleAnalysisError({
							message: 'Jev found no calendar months in the OCR document'
						});
					}

					const days: ScheduleDay[] = [];
					for (const { month, year } of months) {
						const candidates = validDays(month, year);
						const monthState = { ...state, targetMonth: month, targetYear: year };
						const openDays: Array<{ day: number; rangeCount: 1 | 2 }> = [];

						// Jev limits the combined state and question payload. Keep the complete OCR state in
						// every request, but evaluate a bounded number of dates at a time.
						const presenceBatches = yield* Effect.all(
							chunks(candidates, 7).map((candidateChunk) =>
								evaluate(model, monthState, datePresenceQuestions(month, year, candidateChunk)).pipe(
									Effect.map((presence) => ({ candidateChunk, presence }))
								)
							),
							{ concurrency: 5 }
						);

						for (const { candidateChunk, presence } of presenceBatches) {
							for (const day of candidateChunk) {
								const unavailable = yield* probability(presence.answers, `day_${day}_unavailable`);
								if (unavailable >= PRESENT_THRESHOLD) continue;

								const hasHours = yield* probability(presence.answers, `day_${day}_has_hours`);
								if (hasHours < PRESENT_THRESHOLD) continue;

								// Range count is an exhaustive choice; use Jev's winning option after the separate
								// presence decision has established that this date contains hours.
								const rangeCount = yield* choice(presence.answers, `day_${day}_range_count`, 0);
								if (rangeCount === 'one') openDays.push({ day, rangeCount: 1 });
								if (rangeCount === 'two') openDays.push({ day, rangeCount: 2 });
							}
						}
						if (openDays.length === 0) continue;

						const timeBatches = yield* Effect.all(
							chunks(openDays, 4).map((openDayChunk) =>
								evaluate(model, monthState, timeQuestions(month, year, openDayChunk)).pipe(
									Effect.map((times) => ({ openDayChunk, times }))
								)
							),
							{ concurrency: 4 }
						);

						for (const { openDayChunk, times } of timeBatches) {
							for (const { day, rangeCount } of openDayChunk) {
								const date = `${month} ${day}, ${year}`;
								const first = yield* readRange(times.answers, date, day, 'first').pipe(
									Effect.tapError((error) => Effect.logWarning(`Skipping unresolved date ${date}`, error)),
									Effect.option
								);
								if (Option.isNone(first)) continue;

								const hours: TimeRange[] = [first.value];
								if (rangeCount === 2) {
									const second = yield* readRange(times.answers, date, day, 'second').pipe(
										Effect.tapError((error) =>
											Effect.logWarning(`Ignoring unresolved second time range for ${date}`, error)
										),
										Effect.option
									);
									if (Option.isSome(second)) hours.push(second.value);
								}

								days.push(ScheduleDay.make({ month, day, year, label: 'Open Studio Hours', hours }));
							}
						}
					}

					if (days.length === 0) {
						return yield* new ScheduleAnalysisError({
							message: 'Jev found no dated open-studio hours in the OCR document'
						});
					}

					return days.sort((left, right) => left.iso8601.localeCompare(right.iso8601));
				}).pipe(Effect.tapError(Console.error), Effect.withLogSpan('ScheduleAnalyzer.analyze'));

				return Stream.fromIterableEffect(analysis);
			}
		};
	})
}) {
	static readonly layer = Layer.effect(this, this.make).pipe(
		Layer.provide(MistralOcr.layer),
		Layer.provide(
			TypeSafeDecisionModel.model(JEV_MODEL).pipe(
				Layer.provide(TypeSafeClient.layer),
				Layer.provide(TypeSafeClient.Config.layer),
				Layer.provide(FetchHttpClient.layer)
			)
		),
		Layer.provide(FetchHttpClient.layer)
	);

	static readonly layerDevelopment = Layer.unwrap(
		Effect.promise(() => import('@effect/platform-node')).pipe(
			Effect.map(({ NodeFileSystem }) =>
				Layer.effect(
					ScheduleAnalyzer,
					Effect.gen(function* () {
						const fs = yield* FileSystem.FileSystem;
						return {
							analyze: () =>
								fs.readFile('mocks/ScheduleAnalyzer/default.json').pipe(
									Effect.map((file) => new TextDecoder().decode(file)),
									Effect.flatMap(Schema.decodeUnknownEffect(Schema.fromJsonString(Schema.Array(ScheduleDay)))),
									Effect.orDie,
									Stream.fromIterableEffect
								)
						};
					})
				).pipe(Layer.provide(NodeFileSystem.layer))
			)
		)
	);
}
