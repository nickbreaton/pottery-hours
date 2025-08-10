import { FetchHttpClient } from '@effect/platform';
import { Layer, ManagedRuntime } from 'effect';
import { RpcClient, RpcSerialization } from '@effect/rpc';

const ProtocolLive = RpcClient.layerProtocolHttp({ url: '/api/rpc' }).pipe(
	Layer.provide([FetchHttpClient.layer, RpcSerialization.layerNdjson])
);

const layers = Layer.mergeAll(FetchHttpClient.layer, ProtocolLive);

export const runtime = ManagedRuntime.make(layers);
