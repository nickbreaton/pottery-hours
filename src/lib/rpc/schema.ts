import { ScheduleDay, URLFromSpreadsheetId } from '$lib/schema';
import { Rpc, RpcGroup } from '@effect/rpc';

export class ImportRpcs extends RpcGroup.make(
	Rpc.make('ParseSpreadsheet', {
		payload: URLFromSpreadsheetId,
		success: ScheduleDay,
		stream: true
	})
) {}
