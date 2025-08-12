import type { RemoteQueryFunction } from '@sveltejs/kit';

export type RemoteValue<T> = T extends RemoteQueryFunction<any, infer R> ? R : never;
