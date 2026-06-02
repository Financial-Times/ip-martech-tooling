import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { after, before, describe, it } from 'node:test';
import logger from '@dotcom-reliability-kit/logger';
import { createFetchWithRetries } from '@financial-times/martech-fetch-with-retries';

describe('@financial-times/martech-fetch-with-retries end-to-end', () => {
	let child;
	let baseUrl;

	before((_, done) => {
		child = fork(`${import.meta.dirname}/fixtures/app.js`);
		child.on('message', (message) => {
			if (message?.ready) {
				baseUrl = `http://localhost:${message.port}`;
				done();
			}
		});
	});

	after(() => {
		if (child.exitCode === null) {
			child.kill('SIGINT');
		}
	});

	it('retries a 500 response and eventually succeeds', async () => {
		const logger = createLogger();
		const fetchWithRetries = createFetchWithRetries(logger, { backoffStrategy: () => 0 });

		const response = await fetchWithRetries(`${baseUrl}/retry-500`);

		assert.strictEqual(response.status, 200);
		assert.strictEqual(await response.text(), 'ok after 500');
		assert.deepStrictEqual(logger.debugEvents[0], {
			event: 'FETCH_WITH_RETRIES_RETRY_SCHEDULED',
			currentAttemptCount: 1,
			attemptsRemaining: 2,
			method: 'GET',
			inputHost: 'localhost',
			delayMs: 0,
			reason: 'response-status',
			statusCode: 500
		});
	});

	it('retries a 429 response and eventually succeeds', async () => {
		const logger = createLogger();
		const fetchWithRetries = createFetchWithRetries(logger, { backoffStrategy: () => 0 });

		const response = await fetchWithRetries(`${baseUrl}/retry-429`);

		assert.strictEqual(response.status, 200);
		assert.strictEqual(await response.text(), 'ok after 429');
		assert.strictEqual(logger.debugEvents[0].delayMs, 0);
		assert.strictEqual(logger.debugEvents[0].statusCode, 429);
	});

	it('does not retry a non-retryable 404 response', async () => {
		const logger = createLogger();
		const fetchWithRetries = createFetchWithRetries(logger, { backoffStrategy: () => 0 });

		const response = await fetchWithRetries(`${baseUrl}/status/404`);

		assert.strictEqual(response.status, 404);
		assert.strictEqual(logger.debugEvents.length, 0);
		assert.strictEqual(logger.warnEvents.length, 0);
	});

	it('retries a thrown transport error and then succeeds', async () => {
		const logger = createLogger();
		const fetchWithRetries = createFetchWithRetries(logger, { backoffStrategy: () => 0 });

		const response = await fetchWithRetries(`${baseUrl}/hangup-once`);

		assert.strictEqual(response.status, 200);
		assert.strictEqual(await response.text(), 'ok after hangup');
		assert.strictEqual(logger.debugEvents[0].reason, 'fetch-error');
		assert.strictEqual(logger.debugEvents[0].inputHost, 'localhost');
	});

	it('works with @dotcom-reliability-kit/logger', async () => {
		const fetchWithRetriesLogger = logger.createChildLogger({
			component: 'fetch-with-retries-test'
		});
		const fetchWithRetries = createFetchWithRetries(fetchWithRetriesLogger, {
			backoffStrategy: () => 0
		});

		const response = await fetchWithRetries(
			`${baseUrl}/retry-500?arbitrary-param-to-make-this-request-unique`
		);

		assert.strictEqual(response.status, 200);
		assert.strictEqual(await response.text(), 'ok after 500');
	});
});

function createLogger() {
	const debugEvents = [];
	const warnEvents = [];

	return {
		debugEvents,
		warnEvents,
		debug(event) {
			debugEvents.push(event);
		},
		warn(event) {
			warnEvents.push(event);
		}
	};
}
