/** @import { BackoffContext, FetchInput, FetchWithRetriesOptions, RetryLogger } from '../types/internal.js' */

export const DEFAULT_MAXIMUM_ATTEMPTS = 3;
export const RETRY_SCHEDULED_EVENT = 'FETCH_WITH_RETRIES_RETRY_SCHEDULED';
export const RETRIES_EXHAUSTED_EVENT = 'FETCH_WITH_RETRIES_RETRIES_EXHAUSTED';

const DEFAULT_INITIAL_DELAY_MS = 1000;
const HTTP_STATUS_CODES = Object.freeze({
	BAD_GATEWAY: 502,
	GATEWAY_TIMEOUT: 504,
	IM_A_TEAPOT: 418,
	INTERNAL_SERVER_ERROR: 500,
	REQUEST_TIMEOUT: 408,
	SERVICE_UNAVAILABLE: 503,
	TOO_MANY_REQUESTS: 429
});
const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE']);
const POST_METHOD = 'POST';
const PATCH_METHOD = 'PATCH';
const RETRYABLE_STATUS_CODES = new Set([
	HTTP_STATUS_CODES.BAD_GATEWAY,
	HTTP_STATUS_CODES.GATEWAY_TIMEOUT,
	HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
	HTTP_STATUS_CODES.REQUEST_TIMEOUT,
	HTTP_STATUS_CODES.SERVICE_UNAVAILABLE,
	HTTP_STATUS_CODES.TOO_MANY_REQUESTS
]);

/**
 * Validates that the provided logger object has the required debug() and warn()
 * methods.
 *
 * @param {RetryLogger} logger
 * @returns {void}
 */
export function assertValidLogger(logger) {
	if (
		!logger ||
		typeof logger !== 'object' ||
		typeof logger.debug !== 'function' ||
		typeof logger.warn !== 'function'
	) {
		throw new TypeError('A logger with debug() and warn() methods is required');
	}
}

/**
 * Validates the provided options object for fetch-with-retries. Checks for
 * valid maximumAttempts, backoffStrategy, retryPostRequests, and
 * retryPatchRequests.
 *
 * @param {FetchWithRetriesOptions} options
 * @returns {void}
 */
export function assertValidOptions(options) {
	if (!options || typeof options !== 'object' || Array.isArray(options)) {
		throw new TypeError('options must be an object when provided');
	}

	if (
		options.maximumAttempts !== undefined &&
		(!Number.isInteger(options.maximumAttempts) || options.maximumAttempts < 1)
	) {
		throw new TypeError('maximumAttempts must be an integer greater than or equal to 1');
	}

	if (options.backoffStrategy !== undefined && typeof options.backoffStrategy !== 'function') {
		throw new TypeError('backoffStrategy must be a function when provided');
	}

	if (options.retryPostRequests !== undefined && typeof options.retryPostRequests !== 'boolean') {
		throw new TypeError('retryPostRequests must be a boolean when provided');
	}

	if (
		options.retryPatchRequests !== undefined &&
		typeof options.retryPatchRequests !== 'boolean'
	) {
		throw new TypeError('retryPatchRequests must be a boolean when provided');
	}
}

/**
 * Validates that the provided fetch implementation is a function.
 * It doesn’t do anything fancy.
 *
 * @param {any} fetchImplementation
 * @returns {void}
 */
export function assertValidNativeFetch(fetchImplementation) {
	if (typeof fetchImplementation !== 'function') {
		throw new TypeError('Provided fetch implementation must be a function');
	}
}

/**
 * Determines the HTTP method of a request based on the provided input and init
 * options. It checks for the method in the init object first, then looks for it
 * on the input object if it’s an object with a method property. Otherwise it
 * returns 'GET'.
 *
 * @param {FetchInput} input
 * @param {RequestInit | undefined} init
 * @returns {string}
 */
export function getRequestMethod(input, init) {
	// This is a little awkward just so we can support the various kinds of
	// input that the Fetch API allows. So we’re looking for init.method
	// primarily, otherwise looking for the rarer scenario of it being on the input
	// object itself. Else it’s 'GET'.
	const method =
		init?.method ??
		(typeof input === 'object' && input !== null && 'method' in input
			? input.method
			: undefined) ??
		'GET';

	return String(method).toUpperCase();
}

/**
 * Determines if a request method is retryable based on the method type and
 * the provided options. Idempotent methods (GET, HEAD, OPTIONS, PUT, DELETE) are
 * always considered retryable. POST and PATCH methods can be considered retryable
 * if the corresponding options (retryPostRequests and retryPatchRequests) are set
 * to true. This allows for flexible retry behavior based on the specific needs of
 * the application.
 *
 * @param {string} method
 * @param {FetchWithRetriesOptions} options
 * @returns {boolean}
 */
export function isRetryableMethod(method, options) {
	if (IDEMPOTENT_METHODS.has(method)) {
		return true;
	}

	if (method === POST_METHOD) {
		return options.retryPostRequests === true;
	}

	if (method === PATCH_METHOD) {
		return options.retryPatchRequests === true;
	}

	return false;
}

/**
 * Determines if a response is retryable based on its status code. It checks if
 * the response is an object and has a status property that matches one of the
 * predefined retryable status codes (e.g., 408, 429, 500, etc.). This helps the
 * retry logic decide whether to attempt a retry based on the type of error
 * encountered.
 *
 * @param {any} response
 * @returns {boolean}
 */
export function isRetryableResponse(response) {
	if (!response || typeof response !== 'object') {
		return false;
	}

	return RETRYABLE_STATUS_CODES.has(response.status);
}

/**
 * Calculates the next delay in milliseconds based on the provided backoff
 * strategy function and context. It validates that the returned delay is a
 * non-negative finite number before returning it. If the backoff strategy
 * returns an invalid value, it throws a TypeError to ensure that the retry
 * logic can function correctly without unexpected behavior from invalid delays.
 *
 * @param {(context: BackoffContext) => number} backoffStrategy
 * @param {BackoffContext} context
 * @returns {number}
 */
export function getNextDelayInMs(backoffStrategy, context) {
	const delayMs = backoffStrategy(context);

	if (!Number.isFinite(delayMs) || delayMs < 0) {
		throw new TypeError('backoffStrategy must return a non-negative finite number');
	}

	return delayMs;
}

/**
 * Attempts to cancel the response body if it has a cancel() method. This is
 * useful for aborting the download of a response body when we know we’re going to
 * retry the request, so we can free up resources sooner. We catch and ignore any
 * errors that occur during cancellation to avoid interfering with the retry logic.
 *
 * @param {Response | undefined} response
 * @returns {Promise<void>}
 */
export async function cancelResponseBody(response) {
	const cancel = response?.body?.cancel;

	if (typeof cancel !== 'function') {
		return;
	}

	try {
		await cancel.call(response.body);
	} catch {}
}

/**
 * Default strategy that implements exponential backoff. The delay doubles with
 * each retry attempt (e.g., 1s, 2s, 4s, etc.).
 *
 * @param {BackoffContext} context
 * @example
 *   defaultBackoffStrategy({ retryNumber: 1 }) // = 1000 * 2 ** 0 = 1000ms = 1s
 *   defaultBackoffStrategy({ retryNumber: 2 }) // = 1000 * 2 ** 1 = 2000ms = 2s
 *   defaultBackoffStrategy({ retryNumber: 3 }) // = 1000 * 2 ** 2 = 4000ms = 4s
 * @returns {number}
 */
export function defaultBackoffStrategy(context) {
	return DEFAULT_INITIAL_DELAY_MS * 2 ** (context.retryNumber - 1);
}

/**
 * Extracts the hostname from a given value, which can be a string, URL object,
 * or an object with a url property.
 *
 * @param {any} value
 * @returns {string | undefined}
 */
export function getHost(value) {
	if (typeof value === 'string') {
		return tryParseHost(value);
	}

	if (value instanceof URL) {
		return value.hostname;
	}

	return tryParseHost(value?.url);
}

/**
 * Extracts error details such as name, code, and message from an error object
 * if they’re strings. This is useful for logging or reporting errors in a
 * consistent format.
 *
 * @param {any} error
 * @returns {object}
 */
export function getErrorDetails(error) {
	return {
		...(typeof error?.name === 'string' ? { errorName: error.name } : {}),
		...(typeof error?.code === 'string' ? { errorCode: error.code } : {}),
		...(typeof error?.message === 'string' ? { errorMessage: error.message } : {})
	};
}

/**
 * Attempts to parse the input value as a URL and extract the hostname. If
 * parsing fails, it returns undefined instead of throwing an error.
 *
 * @param {string | undefined | null} value
 * @returns {string | undefined}
 */
function tryParseHost(value) {
	try {
		return new URL(value).hostname;
	} catch {
		return undefined;
	}
}
