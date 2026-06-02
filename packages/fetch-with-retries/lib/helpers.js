/** @import { BackoffContext, FetchWithRetriesOptions, RetryLogger } from '../types/internal.js' */

export const DEFAULT_MAXIMUM_ATTEMPTS = 3;
export const RETRY_SCHEDULED_EVENT = 'FETCH_WITH_RETRIES_RETRY_SCHEDULED';
export const RETRIES_EXHAUSTED_EVENT = 'FETCH_WITH_RETRIES_RETRIES_EXHAUSTED';

const DEFAULT_INITIAL_DELAY_MS = 1000;
const HTTP_STATUS_CODES = Object.freeze({
	REQUEST_TIMEOUT: 408,
	IM_A_TEAPOT: 418,
	TOO_MANY_REQUESTS: 429,
	INTERNAL_SERVER_ERROR: 500,
	BAD_GATEWAY: 502,
	SERVICE_UNAVAILABLE: 503,
	GATEWAY_TIMEOUT: 504
});
const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE']);
const POST_METHOD = 'POST';
const PATCH_METHOD = 'PATCH';
const RETRYABLE_STATUS_CODES = new Set([
	HTTP_STATUS_CODES.REQUEST_TIMEOUT,
	HTTP_STATUS_CODES.TOO_MANY_REQUESTS,
	HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
	HTTP_STATUS_CODES.BAD_GATEWAY,
	HTTP_STATUS_CODES.SERVICE_UNAVAILABLE,
	HTTP_STATUS_CODES.GATEWAY_TIMEOUT
]);

/**
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
 * @param {any} fetchImplementation
 * @returns {void}
 */
export function assertValidNativeFetch(fetchImplementation) {
	if (typeof fetchImplementation !== 'function') {
		throw new TypeError('globalThis.fetch must be a function');
	}
}

/**
 * @param {RequestInfo | URL} input
 * @param {RequestInit | undefined} init
 * @returns {string}
 */
export function getRequestMethod(input, init) {
	const method =
		init?.method ??
		(typeof input === 'object' && input !== null && 'method' in input
			? input.method
			: undefined) ??
		'GET';

	return String(method).toUpperCase();
}

/**
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
 * @param {BackoffContext} context
 * @returns {number}
 */
export function defaultBackoffStrategy(context) {
	return DEFAULT_INITIAL_DELAY_MS * 2 ** (context.retryNumber - 1);
}

/**
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
