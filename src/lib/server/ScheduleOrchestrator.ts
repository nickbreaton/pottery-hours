import { Array, Effect, Option, Order, pipe, Record, Schema } from 'effect';
import type { ScheduleStoreMap } from './ScheduleStore';
import { MonthIndexFromMonth, type ScheduleDay } from '$lib/schema';
import type { NonEmptyArray, NonEmptyReadonlyArray } from 'effect/Array';

export class ScheduleOrchestrator extends Effect.Service<ScheduleOrchestrator>()(
	'ScheduleOrchestrator',
	{
		effect: Effect.gen(function* () {
			const daysOrder = Order.struct({
				year: Order.number,
				month: Order.mapInput(Schema.encodeSync(MonthIndexFromMonth))(Order.number),
				day: Order.number
			});

			return {
				getSchedulesMeta: Effect.fn(function* (schedules: ScheduleStoreMap) {
					let active = Option.none<string>();

					const sorted = pipe(
						schedules,
						Record.toEntries,
						Array.map(([id, { days }]) => ({ id, days: Array.sort(daysOrder)(days) })),
						Array.sort(Order.mapInput(({ id: _, days }) => days[0])(daysOrder))
					);

					for (const { id, days } of sorted) {
						const lastDay = days[days.length - 1];

						for (const day of days) {
							if (Order.lessThanOrEqualTo(daysOrder)(day, lastDay)) {
								active = Option.some(id);
								break;
							}

							if (Option.isSome(active)) {
								break;
							}
						}
					}

					return {
						order: Array.map(sorted, ({ id }) => id),
						active: Option.getOrElse(active, () => sorted.at(-1)?.id!)
					};
				}),
				getScheduleLabel: Effect.fn(function* (days: NonEmptyReadonlyArray<ScheduleDay>) {
					const makeLabelPart = ({ month, year }: { month: string; year: number }) =>
						`${month} ${year}`;

					const labelStart = pipe(days, Array.min(daysOrder), makeLabelPart);
					const labelEnd = pipe(days, Array.max(daysOrder), makeLabelPart);

					return `${labelStart} - ${labelEnd}`;
				})
			};
		})
	}
) {}
