import { Cause, Chunk } from 'effect';
import { isHttpError, isRedirect } from '@sveltejs/kit';
import { FiberFailureCauseId, isFiberFailure } from 'effect/Runtime';

export const withSvelteKitResponses = <T>(promise: Promise<T>) => {
	return promise.catch((error) => {
		if (isFiberFailure(error)) {
			const defects = Cause.defects(error[FiberFailureCauseId]).pipe(Chunk.toArray);

			for (const defect of defects) {
				if (isRedirect(defect) || isHttpError(defect)) {
					throw defect;
				}
			}
		}

		throw error;
	});
};
