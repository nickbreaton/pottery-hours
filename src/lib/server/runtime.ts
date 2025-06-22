import { Config, ConfigProvider, Layer, ManagedRuntime } from 'effect';
import { ScheduleAnalyzer } from './ScheduleAnalyzer';
import { FetchHttpClient } from '@effect/platform';
import { env } from '$env/dynamic/private';
import { DevTools } from '@effect/experimental';
import { NodeSocket } from '@effect/platform-node';
import { AnthropicClient, AnthropicLanguageModel } from '@effect/ai-anthropic';

const DevToolsLive = DevTools.layerWebSocket().pipe(
	Layer.provide(NodeSocket.layerWebSocketConstructor)
);

const layers = ScheduleAnalyzer.Default.pipe(
	Layer.provide(
		AnthropicClient.layerConfig({
			apiKey: Config.redacted('ANTHROPIC_API_KEY')
		})
	),
	Layer.provide(FetchHttpClient.layer),
	Layer.provide(Layer.setConfigProvider(ConfigProvider.fromJson(env))),
	Layer.provide(DevToolsLive)
);

export const runtime = ManagedRuntime.make(layers);
