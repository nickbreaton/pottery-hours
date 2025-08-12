declare module 'hour-convert' {
	export type Meridiem = 'am' | 'pm' | (string & {});

	export interface Time {
		hour: number;
		meridiem: Meridiem;
	}

	export interface ConvertedTime {
		hour: number;
		meridiem: Meridiem;
		meridiem: Meridiem;
	}

	const hourConvert: {
		to12Hour(hour: number): ConvertedTime;
		to24Hour(time: Time): number;
	};

	export default hourConvert;
}
