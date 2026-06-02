import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const { default: createFetchWithRetries } = await import(
	'../../../lib/create-fetch-with-retries.js'
);
const packageExports = await import('@financial-times/martech-fetch-with-retries');

describe('@financial-times/martech-fetch-with-retries', () => {
	describe('.createFetchWithRetries', () => {
		it('aliases lib/create-fetch-with-retries', () => {
			assert.strictEqual(packageExports.createFetchWithRetries, createFetchWithRetries);
		});
	});

	describe('exports', () => {
		it('only exports createFetchWithRetries from the package root', () => {
			assert.deepStrictEqual(Object.keys(packageExports).sort(), ['createFetchWithRetries']);
		});
	});
});
