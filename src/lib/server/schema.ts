import { ParseResult, Schema } from 'effect';

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

export const MonthIndexFromMonth = Schema.transform(Schema.Int, Month, {
	strict: true,
	decode: (index) => Array.from(Month.literals)[index],
	encode: (month) => Array.from(Month.literals).findIndex((m) => m === month)
});

export const URLFromSpreadsheetId = Schema.transformOrFail(Schema.URL, Schema.String, {
	strict: true,
	decode: (url, options, ast) => {
		if (!url.href.startsWith('https://docs.google.com/spreadsheets/d/')) {
			return ParseResult.fail(
				new ParseResult.Type(
					ast,
					url,
					'URL does not start with "https://docs.google.com/spreadsheets/d/"'
				)
			);
		}

		const match = url.pathname.match(new RegExp('/spreadsheets/d/([a-zA-Z0-9-_]+)'))?.[1];

		if (match == null) {
			return ParseResult.fail(
				new ParseResult.Type(ast, url, 'URL does not contain a spreadsheet ID')
			);
		}

		return ParseResult.succeed(match);
	},
	encode: (id, options, ast) => {
		if (!id.match(new RegExp('([a-zA-Z0-9-_]+)'))) {
			return ParseResult.fail(
				new ParseResult.Type(ast, id, 'ID does not match the expected format')
			);
		}
		return ParseResult.succeed(new URL(`https://docs.google.com/spreadsheets/d/${id}`));
	}
});

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
