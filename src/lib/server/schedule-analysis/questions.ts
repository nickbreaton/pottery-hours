import { DecisionQuery, type DecisionSchema } from '@effect-agent/ai-decision';
import { MONTHS } from '$lib/utils/datetime';

const hourOptions = Object.fromEntries([
	...Array.from({ length: 12 }, (_, index) => [String(index + 1), null]),
	['none', 'The requested time or time range is not stated for this date.']
]) as Record<string, string | null>;

const minuteOptions = Object.fromEntries([
	...Array.from({ length: 60 }, (_, minute) => [String(minute).padStart(2, '0'), null]),
	['none', 'The requested time or time range is not stated for this date.']
]) as Record<string, string | null>;

const meridiemOptions = {
	AM: null,
	PM: null,
	none: 'The requested time or time range is not stated for this date.'
} as const;

export const metadataQuestions = (currentYear: number): DecisionSchema.Questions => {
	const years = Object.fromEntries([
		...Array.from({ length: 16 }, (_, index) => [
			String(currentYear - 5 + index),
			`The schedule assigns this month to ${currentYear - 5 + index}.`
		]),
		['unknown', 'The year for this month cannot be determined from the document.']
	]);
	const questions: Record<string, DecisionSchema.Question> = {};

	for (const month of MONTHS) {
		questions[`month_${month}_present`] = DecisionQuery.probability({
			instructions: `Does the schedule contain at least one dated calendar cell in ${month}? Ignore month names that only occur in unrelated prose.`
		});
		questions[`month_${month}_year`] = DecisionQuery.choice({
			instructions: `Which year applies to the dated ${month} calendar cells? Use explicit document headings and the chronological sequence across pages.`,
			options: years
		});
	}

	return questions;
};

export const datePresenceQuestions = (
	month: string,
	year: number,
	days: ReadonlyArray<number>
): DecisionSchema.Questions => {
	const questions: Record<string, DecisionSchema.Question> = {};

	for (const day of days) {
		const date = `${month} ${day}, ${year}`;
		questions[`day_${day}_unavailable`] = DecisionQuery.probability({
			instructions: `Does the calendar cell for ${date} explicitly say Closed, Session Over, or otherwise explicitly state that open studio is unavailable? Read only this exact date's cell.`,
			criteria: {
				true: 'This exact date cell explicitly says Closed, Session Over, or unavailable.',
				false: 'This exact date cell does not contain an explicit unavailable status.'
			}
		});
		questions[`day_${day}_has_hours`] = DecisionQuery.probability({
			instructions: `Does the calendar cell for ${date} explicitly contain at least one open-studio time range? Ignore general private-lesson hours and all prose outside this exact date's cell.`,
			criteria: {
				true: 'This date cell contains at least one explicit open-studio time range.',
				false: 'The date is absent, Closed, Session Over, empty, or has no explicit time range.'
			}
		});
		questions[`day_${day}_range_count`] = DecisionQuery.choice({
			instructions: `How many explicit open-studio time ranges are in the calendar cell for ${date}? Count only ranges inside this exact date's cell. Ignore general private-lesson hours and other prose.`,
			options: {
				none: 'The date is absent, Closed, Session Over, empty, or has no explicit time range.',
				one: 'The date cell contains exactly one explicit time range.',
				two: 'The date cell contains two explicit time ranges.'
			}
		});
	}

	return questions;
};

const componentQuestion = (
	date: string,
	range: 'first' | 'second',
	edge: 'start' | 'end',
	component: 'hour' | 'minute' | 'meridiem'
) => {
	const options = component === 'hour' ? hourOptions : component === 'minute' ? minuteOptions : meridiemOptions;
	return DecisionQuery.choice({
		instructions: `For ${date}, what is the ${component} of the ${edge} time in the ${range} open-studio time range, in reading order? Read only that date's calendar cell.`,
		options
	});
};

export const timeQuestions = (
	month: string,
	year: number,
	days: ReadonlyArray<{ readonly day: number; readonly rangeCount: 1 | 2 }>
): DecisionSchema.Questions => {
	const questions: Record<string, DecisionSchema.Question> = {};

	for (const { day, rangeCount } of days) {
		const date = `${month} ${day}, ${year}`;
		const ranges = rangeCount === 2 ? (['first', 'second'] as const) : (['first'] as const);

		for (const range of ranges) {
			for (const edge of ['start', 'end'] as const) {
				for (const component of ['hour', 'minute', 'meridiem'] as const) {
					questions[`day_${day}_${range}_${edge}_${component}`] = componentQuestion(date, range, edge, component);
				}
			}
		}
	}

	return questions;
};
