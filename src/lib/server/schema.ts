import { Schema as S } from 'effect';

export const Month = S.Literal(
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December'
);

export const Meridiem = S.Literal('AM', 'PM');

export class ScheduleDay extends S.Class<ScheduleDay>('ScheduleDay')({
	month: Month,
	day: S.Number,
	label: S.String,
	hours: S.Array(
		S.Struct({
			start_hour: S.Number,
			start_minute: S.Number,
			start_meridiem: Meridiem,
			end_hour: S.Number,
			end_minute: S.Number,
			end_meridiem: Meridiem
		})
	)
}) {}
