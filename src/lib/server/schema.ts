import { Schema } from 'effect';

export const Month = Schema.Literal(
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

export const Meridiem = Schema.Literal('AM', 'PM');

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
}) {}

export const FileFromSelf = Schema.declare((input: unknown): input is File => {
	return input instanceof File;
});

export const PdfFile = FileFromSelf.pipe(Schema.filter((file) => file.type === 'application/pdf'));

export type PdfFile = typeof PdfFile.Type;
