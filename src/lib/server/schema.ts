import { getShortMonthName, getUniqueCalendarMonths, MONTHS } from '$lib/utils/datetime';

import { Effect, Order, Schema, SchemaIssue, SchemaTransformation } from 'effect';

const SpreadsheetId = Schema.String.pipe(Schema.check(Schema.isPattern(/^[a-zA-Z0-9-_]+$/)));

export const URLFromSpreadsheetId = Schema.String.pipe(
	Schema.decodeTo(
		SpreadsheetId,
		SchemaTransformation.transformEffect({
			decode: (url, options) => {
				const match = url.match(/^https:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1];
				return match === undefined
					? Effect.fail(new SchemaIssue.InvalidValue({ message: 'Invalid Google Sheets URL' }, url, options))
					: Effect.succeed(match);
			},
			encode: (id) => Effect.succeed(`https://docs.google.com/spreadsheets/d/${id}`)
		})
	)
);

export const Month = Schema.Literals(MONTHS);

export const MonthIndexFromMonth = Schema.Int.pipe(
	Schema.decodeTo(
		Month,
		SchemaTransformation.transform({
			decode: (index) => MONTHS[index]!,
			encode: (month) => MONTHS.findIndex((m) => m === month)
		})
	)
);

export const Meridiem = Schema.Literals(['AM', 'PM']);

export class ScheduleDay extends Schema.Class<ScheduleDay>('ScheduleDay')({
	month: Month,
	day: Schema.Int,
	year: Schema.Int,
	label: Schema.String,
	hours: Schema.Array(
		Schema.Struct({
			start_hour: Schema.Int,
			start_minute: Schema.Int,
			start_meridiem: Meridiem,
			end_hour: Schema.Int,
			end_minute: Schema.Int,
			end_meridiem: Meridiem
		})
	)
}) {
	get iso8601() {
		const monthIndex = Schema.encodeSync(MonthIndexFromMonth)(this.month) + 1;
		return `${this.year}-${String(monthIndex).padStart(2, '0')}-${String(this.day).padStart(2, '0')}`;
	}
}

export class PotterySchedule extends Schema.Class<PotterySchedule>('PotterySchedule')({
	id: Schema.String,
	days: Schema.Array(ScheduleDay),
	createdAt: Schema.DateFromString,
	spreadsheetId: Schema.String,
	published: Schema.Boolean
}) {
	static get order() {
		return Order.flip(Order.mapInput(Order.Date, (schedule: PotterySchedule) => schedule.createdAt));
	}

	get file() {
		return `/file/${this.id}.pdf`;
	}

	get title() {
		const calendarMonths = getUniqueCalendarMonths(this.days);
		const first = calendarMonths[0];
		const last = calendarMonths.at(-1);

		if (!last) {
			return `${getShortMonthName(first[1])} ${first[0]}`;
		}

		return `${getShortMonthName(first[1])} ${first[0]} - ${getShortMonthName(last[1])} ${last[0]}`;
	}
}
