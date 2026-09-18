import { env } from '$env/dynamic/private';
import { OpenRouterClient } from '@effect/ai-openrouter';
import { Config, ConfigProvider, Layer, ManagedRuntime } from 'effect';
import { FetchHttpClient } from 'effect/unstable/http';
import { CalendarRepo } from './CalendarRepo';
import { ScheduleRepo } from './ScheduleRepo';
import { AuthRepo } from './AuthRepo';
import { KeyValueStore } from './KeyValueStore';

const live = Layer.mergeAll(ScheduleRepo.layer, AuthRepo.layer, CalendarRepo.layer).pipe(
	Layer.provide(KeyValueStore.Auto),
	Layer.provide(OpenRouterClient.layerConfig({ apiKey: Config.Redacted('OPEN_ROUTER_API_KEY') })),
	Layer.provide(ConfigProvider.layer(ConfigProvider.fromUnknown(env))),
	Layer.provide(FetchHttpClient.layer)
);

export const runtime = ManagedRuntime.make(live);
