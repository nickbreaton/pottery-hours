export type CalendarMonth = [year: number, monthIndex: number];

export type Iso8601Date = `${number}${number}${number}${number}-${number}${number}-${number}${number}`;

export const MONTHS = [
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
] as const;

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export function getUniqueCalendarMonths(days: ReadonlyArray<{ year: number; month: string | number }>) {
	const result: CalendarMonth[] = [];

	for (const day of days) {
		const monthIndex = typeof day.month === 'string' ? MONTHS.findIndex((it) => it === day.month) : day.month;
		const year = day.year;

		if (result.find((existing) => existing[0] === year && existing[1] === monthIndex)) {
			continue;
		}

		result.push([year, monthIndex]);
	}

	return result;
}

export function getShortMonthName(monthIndex: number) {
	const name = MONTHS[monthIndex].slice(0, 3);
	return name === 'Sep' ? 'Sept' : name;
}
