import { User, UserRpcs } from '$lib/rpc';
import { Effect, Layer, Schedule, Stream, Streamable } from 'effect';
import type { RequestHandler } from './$types';
import { RpcSerialization, RpcServer } from '@effect/rpc';
import { HttpServer } from '@effect/platform';

const UsersLive = UserRpcs.toLayer(
	Effect.gen(function* () {
		return {
			UserList: () =>
				Stream.fromIterable([
					new User({ id: '1', name: 'John Doe' }),
					new User({ id: '2', name: 'Jane Doe' })
				]).pipe(Stream.schedule(Schedule.spaced('2 second')))
		};
	})
);

const { handler } = RpcServer.toWebHandler(UserRpcs, {
	layer: Layer.mergeAll(UsersLive, RpcSerialization.layerNdjson, HttpServer.layerContext)
});

export const GET: RequestHandler = async ({ request }) => {
	return handler(request);
};

export const POST: RequestHandler = async ({ request }) => {
	return handler(request);
};
