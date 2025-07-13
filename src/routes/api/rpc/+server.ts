import { ImportRpcs } from '$lib/rpc/schema';
import { Effect, Layer, Schedule, Stream, Streamable } from 'effect';
import type { RequestHandler } from './$types';
import { RpcSerialization, RpcServer } from '@effect/rpc';
import { HttpServer } from '@effect/platform';
import { ImportLive } from '$lib/rpc/handlers';
import { layer } from '$lib/server/runtime';

const { handler } = RpcServer.toWebHandler(ImportRpcs, {
	layer: Layer.mergeAll(
		ImportLive.pipe(Layer.provide(layer)),
		RpcSerialization.layerNdjson,
		HttpServer.layerContext
	)
});

export const POST: RequestHandler = async ({ request }) => {
	return handler(request);
};
