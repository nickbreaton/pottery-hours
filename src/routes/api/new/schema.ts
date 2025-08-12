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

export const CompleteEvent = Schema.Struct({
	type: Schema.Literal('complete'),
	id: Schema.String
});

export const CreateEvent = Schema.Union(InvalidEvent, DayEvent, CompleteEvent);
