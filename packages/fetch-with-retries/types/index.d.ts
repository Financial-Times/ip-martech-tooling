declare module '@financial-times/martech-fetch-with-retries' {
	export type RetryReason = 'response-status' | 'fetch-error';

	export type RetryScheduledEvent = {
		event: 'FETCH_WITH_RETRIES_RETRY_SCHEDULED';
		currentAttemptCount: number;
		attemptsRemaining: number;
		method: string;
		inputHost: string | undefined;
		delayMs: number;
		reason: RetryReason;
		statusCode?: number;
		errorName?: string;
		errorCode?: string;
		errorMessage?: string;
	};

	export type RetriesExhaustedEvent = {
		event: 'FETCH_WITH_RETRIES_RETRIES_EXHAUSTED';
		currentAttemptCount: number;
		attemptsRemaining: number;
		method: string;
		inputHost: string | undefined;
		reason: RetryReason;
		statusCode?: number;
		errorName?: string;
		errorCode?: string;
		errorMessage?: string;
	};

	export type RetryLogEvent = RetryScheduledEvent | RetriesExhaustedEvent;

	export type RetryLogger = {
		debug: (event: RetryScheduledEvent) => void;
		warn: (event: RetriesExhaustedEvent) => void;
	};

	export type BackoffContext = {
		retryNumber: number;
		input: RequestInfo | URL;
		init?: RequestInit;
		response?: globalThis.Response;
		error?: unknown;
	};

	export type BackoffStrategy = (context: BackoffContext) => number;

	export type FetchWithRetriesOptions = {
		maximumAttempts?: number;
		backoffStrategy?: BackoffStrategy;
		retryPostRequests?: boolean;
		retryPatchRequests?: boolean;
	};

	export function createFetchWithRetries(
		logger: RetryLogger,
		options?: FetchWithRetriesOptions
	): typeof globalThis.fetch;
}
