import { env } from '$env/dynamic/private';
import { OpenRouterClient } from '@effect/ai-openrouter';
import { FetchHttpClient } from '@effect/platform';
import { Config, ConfigProvider, Effect, Layer, ManagedRuntime } from 'effect';
import { CalendarRepo } from './CalendarRepo';
import { ScheduleRepo } from './ScheduleRepo';
import { AuthRepo } from './AuthRepo';
import { KeyValueStore } from './KeyValueStore';

const live = ScheduleRepo.Default.pipe(
	Layer.merge(AuthRepo.Default),
	Layer.merge(CalendarRepo.Default),
	Layer.provide(KeyValueStore.Auto),
	Layer.provide(OpenRouterClient.layerConfig({ apiKey: Config.redacted('OPEN_ROUTER_API_KEY') })),
	Layer.provide(Layer.setConfigProvider(ConfigProvider.fromJson(env))),
	Layer.provide(FetchHttpClient.layer)
);

export const runtime = ManagedRuntime.make(live);
