import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import { defaultBackoffStrategy } from '../../lib/helpers.js';

const originalFetch = globalThis.fetch;

const { createFetchWithRetries } = await import('@financial-times/martech-fetch-with-retries');

const RETRY_EVENT = 'FETCH_WITH_RETRIES_RETRY_SCHEDULED';
const EXHAUSTED_EVENT = 'FETCH_WITH_RETRIES_RETRIES_EXHAUSTED';

afterEach(() => {
	globalThis.fetch = originalFetch;
});

describe('createFetchWithRetries', () => {
	it('retries a retryable response and logs inputHost retry context', async () => {
		const logger = createLogger();
		const firstResponse = createResponse({
			status: 500,
			url: 'https://api.ft.com/private?token=secret'
		});
		const secondResponse = createResponse({
			status: 200,
			url: 'https://api.ft.com/private?token=secret'
		});
		const fetchMock = setFetchSequence([firstResponse, secondResponse]);
		const fetchWithRetries = createFetchWithRetries(logger, { backoffStrategy: () => 0 });

		const response = await fetchWithRetries('https://api.ft.com/private?token=secret');

		assert.strictEqual(response, secondResponse);
		assert.strictEqual(fetchMock.mock.callCount(), 2);
		assert.strictEqual(logger.debug.mock.callCount(), 1);
		assert.strictEqual(logger.warn.mock.callCount(), 0);
		assert.deepStrictEqual(logger.debug.mock.calls[0].arguments[0], {
			attemptsRemaining: 2,
			currentAttemptCount: 1,
			delayMs: 0,
			event: RETRY_EVENT,
			inputHost: 'api.ft.com',
			method: 'GET',
			reason: 'response-status',
			statusCode: 500
		});
		assert.ok(!Object.hasOwn(logger.debug.mock.calls[0].arguments[0], 'url'));
		assert.ok(!Object.hasOwn(logger.debug.mock.calls[0].arguments[0], 'path'));
		assert.ok(!Object.hasOwn(logger.debug.mock.calls[0].arguments[0], 'query'));
	});

	it('cancels an intermediate retryable response body before retrying', async () => {
		const logger = createLogger();
		const cancel = mock.fn(async () => undefined);
		const firstResponse = createResponse({ status: 503, body: { cancel } });
		const secondResponse = createResponse({ status: 200 });

		setFetchSequence([firstResponse, secondResponse]);
		const fetchWithRetries = createFetchWithRetries(logger, { backoffStrategy: () => 0 });

		const response = await fetchWithRetries('https://api.ft.com/content');

		assert.strictEqual(response, secondResponse);
		assert.strictEqual(cancel.mock.callCount(), 1);
	});

	it('does not cancel a non-retryable response body', async () => {
		const logger = createLogger();
		const cancel = mock.fn(async () => undefined);
		const response = createResponse({ status: 404, body: { cancel } });
		const fetchMock = setFetchSequence([response]);
		const fetchWithRetries = createFetchWithRetries(logger);

		const result = await fetchWithRetries('https://api.ft.com/articles/123');

		assert.strictEqual(result, response);
		assert.strictEqual(fetchMock.mock.callCount(), 1);
		assert.strictEqual(cancel.mock.callCount(), 0);
		assert.strictEqual(logger.debug.mock.callCount(), 0);
		assert.strictEqual(logger.warn.mock.callCount(), 0);
	});

	it('does not retry a 418 response', async () => {
		const logger = createLogger();
		const response = createResponse({ status: 418 });
		const fetchMock = setFetchSequence([response]);
		const fetchWithRetries = createFetchWithRetries(logger);

		const result = await fetchWithRetries('https://api.ft.com/content');

		assert.strictEqual(result, response);
		assert.strictEqual(fetchMock.mock.callCount(), 1);
		assert.strictEqual(logger.debug.mock.callCount(), 0);
		assert.strictEqual(logger.warn.mock.callCount(), 0);
	});

	it('does not retry non-retryable 5xx responses', async () => {
		const logger = createLogger();
		const response = createResponse({ status: 501 });
		const fetchMock = setFetchSequence([response]);
		const fetchWithRetries = createFetchWithRetries(logger, { backoffStrategy: () => 0 });

		const result = await fetchWithRetries('https://api.ft.com/content');

		assert.strictEqual(result, response);
		assert.strictEqual(fetchMock.mock.callCount(), 1);
		assert.strictEqual(logger.debug.mock.callCount(), 0);
		assert.strictEqual(logger.warn.mock.callCount(), 0);
	});

	it('retries 408, 502, and 504 responses', async () => {
		for (const status of [408, 502, 504]) {
			const logger = createLogger();
			const firstResponse = createResponse({ status });
			const secondResponse = createResponse({ status: 200 });
			const fetchMock = setFetchSequence([firstResponse, secondResponse]);
			const fetchWithRetries = createFetchWithRetries(logger, { backoffStrategy: () => 0 });

			const response = await fetchWithRetries('https://api.ft.com/content');

			assert.strictEqual(response, secondResponse);
			assert.strictEqual(fetchMock.mock.callCount(), 2);
			assert.strictEqual(logger.debug.mock.callCount(), 1);
			assert.strictEqual(logger.debug.mock.calls[0].arguments[0].statusCode, status);
		}
	});

	it('does not cancel the final retryable response that is returned', async () => {
		const logger = createLogger();
		const firstCancel = mock.fn(async () => undefined);
		const finalCancel = mock.fn(async () => undefined);
		const firstResponse = createResponse({ status: 503, body: { cancel: firstCancel } });
		const finalResponse = createResponse({ status: 503, body: { cancel: finalCancel } });

		setFetchSequence([firstResponse, finalResponse]);
		const fetchWithRetries = createFetchWithRetries(logger, {
			maximumAttempts: 2,
			backoffStrategy: () => 0
		});

		const response = await fetchWithRetries('https://api.ft.com/content');

		assert.strictEqual(response, finalResponse);
		assert.strictEqual(firstCancel.mock.callCount(), 1);
		assert.strictEqual(finalCancel.mock.callCount(), 0);
	});

	it('ignores response body cancellation errors and still retries', async () => {
		const logger = createLogger();
		const cancel = mock.fn(async () => {
			throw new Error('cancel failed');
		});
		const firstResponse = createResponse({ status: 503, body: { cancel } });
		const secondResponse = createResponse({ status: 200 });
		const fetchMock = setFetchSequence([firstResponse, secondResponse]);
		const fetchWithRetries = createFetchWithRetries(logger, { backoffStrategy: () => 0 });

		const response = await fetchWithRetries('https://api.ft.com/content');

		assert.strictEqual(response, secondResponse);
		assert.strictEqual(fetchMock.mock.callCount(), 2);
		assert.strictEqual(cancel.mock.callCount(), 1);
	});

	it('retries thrown errors and rethrows after the last attempt', async () => {
		const logger = createLogger();
		const error = Object.assign(new TypeError('socket hang up'), { code: 'ECONNRESET' });
		const fetchMock = setFetchSequence([{ error }, { error }]);
		const fetchWithRetries = createFetchWithRetries(logger, {
			maximumAttempts: 2,
			backoffStrategy: () => 0
		});

		await assert.rejects(
			fetchWithRetries('https://api.ft.com/feed'),
			(receivedError) => receivedError === error
		);

		assert.strictEqual(fetchMock.mock.callCount(), 2);
		assert.strictEqual(logger.debug.mock.callCount(), 1);
		assert.deepStrictEqual(logger.warn.mock.calls[0].arguments[0], {
			event: EXHAUSTED_EVENT,
			currentAttemptCount: 2,
			attemptsRemaining: 0,
			method: 'GET',
			inputHost: 'api.ft.com',
			reason: 'fetch-error',
			errorName: 'TypeError',
			errorCode: 'ECONNRESET',
			errorMessage: 'socket hang up'
		});
	});

	it('retries idempotent methods but not POST or PATCH by default', async () => {
		const logger = createLogger();
		const putFetch = createFetchSequence([
			createResponse({ status: 503 }),
			createResponse({ status: 200 })
		]);
		const postFetch = createFetchSequence([createResponse({ status: 503 })]);
		const patchFetch = createFetchSequence([createResponse({ status: 503 })]);
		const traceFetch = createFetchSequence([createResponse({ status: 503 })]);

		globalThis.fetch = putFetch;
		const retryableFetch = createFetchWithRetries(logger, { backoffStrategy: () => 0 });

		globalThis.fetch = postFetch;
		const postFetchWithRetries = createFetchWithRetries(logger, { backoffStrategy: () => 0 });

		globalThis.fetch = patchFetch;
		const patchFetchWithRetries = createFetchWithRetries(logger, { backoffStrategy: () => 0 });

		globalThis.fetch = traceFetch;
		const traceFetchWithRetries = createFetchWithRetries(logger, { backoffStrategy: () => 0 });

		await retryableFetch('https://api.ft.com/content', { method: 'PUT' });
		await postFetchWithRetries('https://api.ft.com/content', { method: 'POST' });
		await patchFetchWithRetries('https://api.ft.com/content', { method: 'PATCH' });
		await traceFetchWithRetries('https://api.ft.com/content', { method: 'TRACE' });

		assert.strictEqual(putFetch.mock.callCount(), 2);
		assert.strictEqual(postFetch.mock.callCount(), 1);
		assert.strictEqual(patchFetch.mock.callCount(), 1);
		assert.strictEqual(traceFetch.mock.callCount(), 1);
	});

	it('retries POST responses when retryPostRequests is enabled', async () => {
		const logger = createLogger();
		const fetchMock = setFetchSequence([
			createResponse({ status: 503 }),
			createResponse({ status: 200 })
		]);
		const fetchWithRetries = createFetchWithRetries(logger, {
			retryPostRequests: true,
			backoffStrategy: () => 0
		});

		const response = await fetchWithRetries('https://api.ft.com/content', { method: 'POST' });

		assert.strictEqual(response.status, 200);
		assert.strictEqual(fetchMock.mock.callCount(), 2);
		assert.strictEqual(logger.debug.mock.calls[0].arguments[0].method, 'POST');
	});

	it('retries PATCH thrown errors when retryPatchRequests is enabled', async () => {
		const logger = createLogger();
		const error = Object.assign(new TypeError('temporary patch failure'), {
			code: 'ECONNRESET'
		});
		const fetchMock = setFetchSequence([{ error }, createResponse({ status: 200 })]);
		const fetchWithRetries = createFetchWithRetries(logger, {
			retryPatchRequests: true,
			backoffStrategy: () => 0
		});

		const response = await fetchWithRetries('https://api.ft.com/content', { method: 'PATCH' });

		assert.strictEqual(response.status, 200);
		assert.strictEqual(fetchMock.mock.callCount(), 2);
		assert.deepStrictEqual(logger.debug.mock.calls[0].arguments[0], {
			event: RETRY_EVENT,
			currentAttemptCount: 1,
			attemptsRemaining: 2,
			method: 'PATCH',
			inputHost: 'api.ft.com',
			delayMs: 0,
			reason: 'fetch-error',
			errorName: 'TypeError',
			errorCode: 'ECONNRESET',
			errorMessage: 'temporary patch failure'
		});
	});

	it('returns the final retryable response and warns when maximumAttempts are exhausted', async () => {
		const logger = createLogger();
		const finalResponse = createResponse({ status: 503, url: null });
		const fetchMock = setFetchSequence([createResponse({ status: 503 }), finalResponse]);
		const fetchWithRetries = createFetchWithRetries(logger, {
			maximumAttempts: 2,
			backoffStrategy: () => 0
		});

		const response = await fetchWithRetries('https://api.ft.com/content');

		assert.strictEqual(response, finalResponse);
		assert.strictEqual(fetchMock.mock.callCount(), 2);
		assert.deepStrictEqual(logger.warn.mock.calls[0].arguments[0], {
			event: EXHAUSTED_EVENT,
			currentAttemptCount: 2,
			attemptsRemaining: 0,
			method: 'GET',
			inputHost: 'api.ft.com',
			reason: 'response-status',
			statusCode: 503
		});
	});

	it('logs undefined inputHost when response retries are exhausted and no host can be derived', async () => {
		const logger = createLogger();
		setFetchSequence([
			createResponse({ status: 503, url: null }),
			createResponse({ status: 503, url: null })
		]);
		const fetchWithRetries = createFetchWithRetries(logger, {
			maximumAttempts: 2,
			backoffStrategy: () => 0
		});

		const response = await fetchWithRetries('not-a-url');

		assert.strictEqual(response.status, 503);
		assert.strictEqual(logger.warn.mock.calls[0].arguments[0].inputHost, undefined);
	});

	it('honors custom maximumAttempts and backoffStrategy delays', async () => {
		const logger = createLogger();
		const firstResponse = createResponse({ status: 503 });
		const secondResponse = createResponse({ status: 200 });
		const backoffStrategy = mock.fn(() => 25);
		const fetchMock = setFetchSequence([firstResponse, secondResponse]);
		const fetchWithRetries = createFetchWithRetries(logger, {
			maximumAttempts: 4,
			backoffStrategy
		});

		const response = await fetchWithRetries('https://api.ft.com/content');

		assert.strictEqual(response, secondResponse);
		assert.strictEqual(fetchMock.mock.callCount(), 2);
		assert.strictEqual(backoffStrategy.mock.callCount(), 1);
		assert.deepStrictEqual(backoffStrategy.mock.calls[0].arguments[0], {
			retryNumber: 1,
			input: 'https://api.ft.com/content',
			init: undefined,
			response: firstResponse
		});
		assert.strictEqual(logger.debug.mock.calls[0].arguments[0].delayMs, 25);
	});

	it('uses exponential backoff by default', async () => {
		assert.strictEqual(defaultBackoffStrategy({ retryNumber: 1 }), 1000);
		assert.strictEqual(defaultBackoffStrategy({ retryNumber: 2 }), 2000);
		assert.strictEqual(defaultBackoffStrategy({ retryNumber: 3 }), 4000);
	});

	it('derives inputHost and method details from URL and Request inputs', async () => {
		const urlLogger = createLogger();
		const urlFetch = createFetchSequence([
			createResponse({ status: 503, url: null }),
			createResponse({ status: 200, url: null })
		]);

		globalThis.fetch = urlFetch;
		const urlFetchWithRetries = createFetchWithRetries(urlLogger, { backoffStrategy: () => 0 });

		await urlFetchWithRetries(new URL('https://search.ft.com/results?q=private'));

		assert.strictEqual(urlLogger.debug.mock.calls[0].arguments[0].inputHost, 'search.ft.com');

		const requestLogger = createLogger();
		const requestFetch = createFetchSequence([
			createResponse({ status: 503, url: null }),
			createResponse({ status: 200, url: null })
		]);
		const request = new Request('https://api.ft.com/content?id=123', { method: 'DELETE' });

		globalThis.fetch = requestFetch;
		const requestFetchWithRetries = createFetchWithRetries(requestLogger, {
			backoffStrategy: () => 0
		});

		await requestFetchWithRetries(request);

		assert.strictEqual(requestLogger.debug.mock.calls[0].arguments[0].method, 'DELETE');
		assert.strictEqual(requestLogger.debug.mock.calls[0].arguments[0].inputHost, 'api.ft.com');
	});

	it('logs undefined inputHost when it cannot derive a valid hostname', async () => {
		const logger = createLogger();
		setFetchSequence([
			createResponse({ status: 503, url: null }),
			createResponse({ status: 200, url: null })
		]);
		const fetchWithRetries = createFetchWithRetries(logger, { backoffStrategy: () => 0 });

		await fetchWithRetries('not-a-url');

		assert.strictEqual(logger.debug.mock.calls[0].arguments[0].inputHost, undefined);
	});

	it('handles thrown non-Error values in retry logs', async () => {
		const logger = createLogger();
		setFetchSequence([{ error: 'boom' }, createResponse({ status: 200 })]);
		const fetchWithRetries = createFetchWithRetries(logger, {
			maximumAttempts: 2,
			backoffStrategy: () => 0
		});

		await fetchWithRetries('https://api.ft.com/content');

		assert.deepStrictEqual(logger.debug.mock.calls[0].arguments[0], {
			event: RETRY_EVENT,
			currentAttemptCount: 1,
			attemptsRemaining: 1,
			method: 'GET',
			inputHost: 'api.ft.com',
			delayMs: 0,
			reason: 'fetch-error'
		});
	});

	it('logs undefined inputHost in fetch-error retry logs when no host can be derived', async () => {
		const logger = createLogger();
		setFetchSequence([{ error: new Error('temporary') }, createResponse({ status: 200 })]);
		const fetchWithRetries = createFetchWithRetries(logger, {
			maximumAttempts: 2,
			backoffStrategy: () => 0
		});

		await fetchWithRetries('not-a-url');

		assert.strictEqual(logger.debug.mock.calls[0].arguments[0].inputHost, undefined);
	});

	it('does not retry thrown errors for non-idempotent methods', async () => {
		const logger = createLogger();
		const error = new Error('do not retry');
		const fetchMock = setFetchSequence([{ error }]);
		const fetchWithRetries = createFetchWithRetries(logger, { backoffStrategy: () => 0 });

		await assert.rejects(
			fetchWithRetries('https://api.ft.com/content', { method: 'POST' }),
			error
		);

		assert.strictEqual(fetchMock.mock.callCount(), 1);
		assert.strictEqual(logger.debug.mock.callCount(), 0);
		assert.strictEqual(logger.warn.mock.callCount(), 0);
	});

	it('logs undefined inputHost when fetch-error retries are exhausted and no host can be derived', async () => {
		const logger = createLogger();
		const error = new Error('still broken');
		setFetchSequence([{ error }, { error }]);
		const fetchWithRetries = createFetchWithRetries(logger, {
			maximumAttempts: 2,
			backoffStrategy: () => 0
		});

		await assert.rejects(fetchWithRetries('not-a-url'), error);

		assert.strictEqual(logger.warn.mock.calls[0].arguments[0].inputHost, undefined);
	});

	it('returns non-Response fetch values as-is when they are not retryable', async () => {
		const logger = createLogger();
		setFetchSequence([null]);
		const fetchWithRetries = createFetchWithRetries(logger, { backoffStrategy: () => 0 });

		const result = await fetchWithRetries('https://api.ft.com/content');

		assert.strictEqual(result, null);
	});

	it('validates the logger, options, and native fetch availability', () => {
		assert.throws(() => createFetchWithRetries(), /logger/i);
		assert.throws(() => createFetchWithRetries({ debug() {}, warn: 'nope' }), /logger/i);
		assert.throws(() => createFetchWithRetries(createLogger(), null), /options/i);
		assert.throws(() => createFetchWithRetries(createLogger(), []), /options/i);
		assert.throws(
			() => createFetchWithRetries(createLogger(), { maximumAttempts: 0 }),
			/maximumAttempts/i
		);
		assert.throws(
			() => createFetchWithRetries(createLogger(), { backoffStrategy: 'nope' }),
			/backoffStrategy/i
		);
		assert.throws(
			() => createFetchWithRetries(createLogger(), { retryPostRequests: 'yes' }),
			/retryPostRequests/i
		);
		assert.throws(
			() => createFetchWithRetries(createLogger(), { retryPatchRequests: 'yes' }),
			/retryPatchRequests/i
		);

		globalThis.fetch = undefined;
		assert.throws(
			() => createFetchWithRetries(createLogger()),
			/Provided fetch implementation must be a function/
		);
	});

	it('throws when backoffStrategy returns an invalid delay', async () => {
		const logger = createLogger();
		setFetchSequence([createResponse({ status: 503 })]);
		const fetchWithRetries = createFetchWithRetries(logger, { backoffStrategy: () => -1 });

		await assert.rejects(fetchWithRetries('https://api.ft.com/content'), /backoffStrategy/i);
	});
});

function createLogger() {
	return {
		debug: mock.fn(() => undefined),
		warn: mock.fn(() => undefined)
	};
}

function setFetchSequence(results) {
	const fetchMock = createFetchSequence(results);
	globalThis.fetch = fetchMock;
	return fetchMock;
}

function createFetchSequence(results) {
	let index = 0;

	return mock.fn(async () => {
		const nextResult = results[Math.min(index, results.length - 1)];
		index += 1;

		if (nextResult && typeof nextResult === 'object' && 'error' in nextResult) {
			throw nextResult.error;
		}

		return nextResult;
	});
}

function createResponse({
	status,
	url = 'https://api.ft.com/resource',
	headers = {},
	body = undefined
}) {
	return {
		ok: status >= 200 && status < 300,
		status,
		url,
		headers: new Headers(headers),
		body
	};
}
