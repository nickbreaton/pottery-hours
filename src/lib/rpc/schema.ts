import { ScheduleDay, URLFromSpreadsheetId } from '$lib/schema';
import { Rpc, RpcGroup } from '@effect/rpc';
import { Schema } from 'effect';
import { ParseError } from 'effect/Cron';

export class ImportRpcs extends RpcGroup.make(
	Rpc.make('ParseSpreadsheet', {
		payload: Schema.Struct({ url: Schema.String }),
		success: ScheduleDay,
		error: Schema.String,
		stream: true
	})
) {}
