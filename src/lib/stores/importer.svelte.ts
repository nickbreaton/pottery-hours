import type { ScheduleDay } from '$lib/server/schema';

// TODO: encapsulate logic that should be private
export const importer = new (class {
	connection: EventSource | null = $state(null);
	validationMessage: string | null = $state(null);
	days: (typeof ScheduleDay.Encoded)[] = $state([]);
	input = $state('');

	reset() {
		this.connection = null;
		this.validationMessage = null;
		this.days = [];
		this.input = '';
	}
})();
