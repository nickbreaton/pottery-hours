import { Layer, ManagedRuntime, Config, ConfigProvider, Redacted, Effect } from 'effect';
import { ScheduleRepo } from './ScheduleRepo';
import { OpenAiClient, OpenAiConfig } from '@effect/ai-openai';
import { env } from '$env/dynamic/private';
import { FetchHttpClient } from '@effect/platform';
import { CalendarRepo } from './CalendarRepo';

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
