import { setTimeout as delay } from 'node:timers/promises';
import {
	assertValidLogger,
	assertValidNativeFetch,
	assertValidOptions,
	cancelResponseBody,
	DEFAULT_MAXIMUM_ATTEMPTS,
	defaultBackoffStrategy,
	getErrorDetails,
	getHost,
	getNextDelayInMs,
	getRequestMethod,
	isRetryableMethod,
	isRetryableResponse,
	RETRIES_EXHAUSTED_EVENT,
	RETRY_SCHEDULED_EVENT
} from './helpers.js';

/** @import { FetchWithRetriesOptions, RetryLogger } from '../types/internal.js' */

/**
 * Create a fetch wrapper which retries retryable failures.
 *
 * @param {RetryLogger} logger
 * @param {FetchWithRetriesOptions} [options]
 * @returns {typeof fetch}
 */
export default function createFetchWithRetries(logger, options = {}) {
	assertValidLogger(logger);
	assertValidOptions(options);
	assertValidNativeFetch(globalThis.fetch);

	const { maximumAttempts = DEFAULT_MAXIMUM_ATTEMPTS, backoffStrategy = defaultBackoffStrategy } =
		options;
	const fetchImplementation = globalThis.fetch;

	return async function fetchWithRetries(input, init) {
		const method = getRequestMethod(input, init);
		const inputHost = getHost(input);
		const shouldRetryMethod = isRetryableMethod(method, options);

		return attemptFetch(1);

		async function attemptFetch(currentAttemptCount) {
			let result;
			let error;
			let didThrow = false;

			try {
				result = await fetchImplementation(input, init);
			} catch (caughtError) {
				didThrow = true;
				error = caughtError;
			}

			if (didThrow) {
				if (!shouldRetryMethod) {
					throw error;
				}
			} else {
				const retryableResponse = isRetryableResponse(result);
				if (!shouldRetryMethod || !retryableResponse) {
					return result;
				}
			}

			const attemptsRemaining = Math.max(maximumAttempts - currentAttemptCount, 0);
			const eventDetails = {
				currentAttemptCount,
				attemptsRemaining,
				method,
				inputHost,
				...(didThrow
					? {
							reason: 'fetch-error',
							...getErrorDetails(error)
						}
					: {
							reason: 'response-status',
							statusCode: result.status
						})
			};

			if (currentAttemptCount === maximumAttempts) {
				logger.warn({
					event: RETRIES_EXHAUSTED_EVENT,
					...eventDetails
				});

				if (didThrow) {
					throw error;
				}

				return result;
			}

			const delayMs = getNextDelayInMs(backoffStrategy, {
				retryNumber: currentAttemptCount,
				input,
				init,
				...(didThrow ? { error } : { response: result })
			});

			if (!didThrow) {
				await cancelResponseBody(result);
			}

			logger.debug({
				event: RETRY_SCHEDULED_EVENT,
				...eventDetails,
				delayMs
			});

			await delay(delayMs);

			return attemptFetch(currentAttemptCount + 1);
		}
	};
}
