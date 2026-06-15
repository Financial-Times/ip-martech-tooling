/**
 * @typedef {string | URL | Request} FetchInput
 */

/**
 * @typedef {object} RetryLogger
 * @property {(event: object) => void} debug
 * @property {(event: object) => void} warn
 */

/**
 * @typedef {object} BackoffContext
 * @property {number} retryNumber
 * @property {FetchInput} input
 * @property {RequestInit | undefined} init
 * @property {any} [response]
 * @property {any} [error]
 */

/**
 * @typedef {object} FetchWithRetriesOptions
 * @property {number} [maximumAttempts]
 * @property {(context: BackoffContext) => number} [backoffStrategy]
 * @property {boolean} [retryPostRequests]
 * @property {boolean} [retryPatchRequests]
 */

export {};
