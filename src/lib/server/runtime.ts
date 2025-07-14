import { Config, ConfigProvider, Effect, Layer, ManagedRuntime } from 'effect';
import { ScheduleAnalyzer } from './ScheduleAnalyzer';
import { FetchHttpClient, HttpClient } from '@effect/platform';
import { env } from '$env/dynamic/private';
import { DevTools } from '@effect/experimental';
import { NodeContext, NodeSocket } from '@effect/platform-node';
import { AnthropicClient, AnthropicLanguageModel } from '@effect/ai-anthropic';
import { OpenAiClient } from '@effect/ai-openai';
import { GoogleSheetsClient } from './GoogleSheetsClient';
import { ScheduleStore } from './ScheduleStore';

const DevToolsLive = DevTools.layerWebSocket().pipe(
	Layer.provide(NodeSocket.layerWebSocketConstructor)
);

const live = Layer.mergeAll(ScheduleAnalyzer.Default, GoogleSheetsClient.Default).pipe(
	Layer.provide(
		AnthropicClient.layerConfig({
			apiKey: Config.redacted('ANTHROPIC_API_KEY')
		})
	),
	Layer.provide(
		OpenAiClient.layerConfig({
			apiKey: Config.redacted('OPENAI_API_KEY')
		})
	),
	Layer.provideMerge(FetchHttpClient.layer),
	Layer.provide(Layer.setConfigProvider(ConfigProvider.fromJson(env))),
	Layer.provide(DevToolsLive) // TODO: split out from deployed
);

const mock = Layer.mergeAll(
	ScheduleAnalyzer.DevelopmentMock,
	GoogleSheetsClient.DevelopmentMock,
	ScheduleStore.DevelopmentMock
).pipe(
	Layer.provide(Layer.setConfigProvider(ConfigProvider.fromJson(env))),
	Layer.provide(DevToolsLive),
	Layer.provide(NodeContext.layer)
);

export const layer = mock;

export const runtime = ManagedRuntime.make(layer);
