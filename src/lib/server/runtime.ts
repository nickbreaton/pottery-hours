import { env } from '$env/dynamic/private';
import { OpenAiClient } from '@effect/ai-openai';
import { FetchHttpClient } from '@effect/platform';
import { Config, ConfigProvider, Effect, Layer, ManagedRuntime } from 'effect';
import { CalendarRepo } from './CalendarRepo';
import { ScheduleRepo } from './ScheduleRepo';

const openRouterLayer = Layer.effect(
	OpenAiClient.OpenAiClient,
	Config.redacted('OPEN_ROUTER_API_KEY').pipe(
		Effect.andThen((apiKey) => OpenAiClient.make({ apiKey, apiUrl: 'https://openrouter.ai/api/v1' }))
	)
);

const live = ScheduleRepo.Default.pipe(
	Layer.merge(CalendarRepo.Default),
	Layer.provide(openRouterLayer),
	Layer.provide(Layer.setConfigProvider(ConfigProvider.fromJson(env))),
	Layer.provide(FetchHttpClient.layer)
);

export const runtime = ManagedRuntime.make(live);
