import { ConfigProvider, Layer, ManagedRuntime } from 'effect';
import { AnthropicClient } from './AnthropicClient';
import { FetchHttpClient } from '@effect/platform';
import { env } from '$env/dynamic/private';
import { Base64 } from './Base64';
import { JsonArrayStreamer } from './JsonArrayStreamer';

const layers = AnthropicClient.Default.pipe(
	Layer.provide(FetchHttpClient.layer),
	Layer.provide(Layer.setConfigProvider(ConfigProvider.fromJson(env))),
	Layer.merge(Base64.Default),
	Layer.merge(JsonArrayStreamer.Default)
);

export const runtime = ManagedRuntime.make(layers);
