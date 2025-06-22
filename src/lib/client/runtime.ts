import { FetchHttpClient } from '@effect/platform';
import { ManagedRuntime } from 'effect';

const layers = FetchHttpClient.layer.pipe();

export const runtime = ManagedRuntime.make(layers);
