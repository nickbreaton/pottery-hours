import { env } from '$env/dynamic/private';
import { ConfigProvider, Layer, ManagedRuntime } from 'effect';
import { FetchHttpClient } from 'effect/unstable/http';
import { CalendarRepo } from './CalendarRepo';
import { ScheduleRepo } from './ScheduleRepo';
import { AuthRepo } from './AuthRepo';
import { KeyValueStore } from './KeyValueStore';

const live = Layer.mergeAll(ScheduleRepo.layer, AuthRepo.layer, CalendarRepo.layer).pipe(
	Layer.provide(KeyValueStore.Auto),
	Layer.provide(ConfigProvider.layer(ConfigProvider.fromUnknown(env))),
	Layer.provide(FetchHttpClient.layer)
);

export const runtime = ManagedRuntime.make(live);
