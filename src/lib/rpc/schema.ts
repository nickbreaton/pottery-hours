import { ScheduleDay, URLFromSpreadsheetId } from '$lib/schema';
import { DisplaySchedule, DisplayScheduleFromScheduleDays } from '$lib/schema/display';
import { Rpc, RpcGroup } from '@effect/rpc';
import { Schema } from 'effect';

export class ParseSpreadsheetProgress extends Schema.Class<ParseSpreadsheetProgress>(
	'ParseSpreadsheetProgress'
)({
	value: ScheduleDay,
	progress: Schema.Number
}) {}

export class ImportRpcs extends RpcGroup.make(
	Rpc.make('ParseSpreadsheet', {
		payload: Schema.Struct({ url: Schema.String }),
		success: ParseSpreadsheetProgress,
		error: Schema.String,
		stream: true
	})
) {}
