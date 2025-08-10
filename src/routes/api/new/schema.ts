import { ScheduleDay } from '$lib/server/schema';
import { Schema } from 'effect';

export const InvalidEvent = Schema.Struct({
	type: Schema.Literal('invalid'),
	message: Schema.String
});

export const DayEvent = Schema.Struct({
	type: Schema.Literal('day'),
	data: ScheduleDay
});

export const Complete = Schema.Struct({
	type: Schema.Literal('complete')
});

export const CreateEvent = Schema.Union(InvalidEvent, DayEvent, Complete);
