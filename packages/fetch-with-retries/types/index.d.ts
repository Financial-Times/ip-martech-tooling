declare module '@financial-times/martech-fetch-with-retries' {
	export type FetchInput = string | URL | Request;

	export type RetryReason = 'response-status' | 'fetch-error';

	export type RetryScheduledEvent = {
		attemptsRemaining: number;
		currentAttemptCount: number;
		delayMs: number;
		errorCode?: string;
		errorMessage?: string;
		errorName?: string;
		event: 'FETCH_WITH_RETRIES_RETRY_SCHEDULED';
		inputHost: string | undefined;
		method: string;
		reason: RetryReason;
		statusCode?: number;
	};

	export type RetriesExhaustedEvent = {
		attemptsRemaining: number;
		currentAttemptCount: number;
		errorCode?: string;
		errorMessage?: string;
		errorName?: string;
		event: 'FETCH_WITH_RETRIES_RETRIES_EXHAUSTED';
		inputHost: string | undefined;
		method: string;
		reason: RetryReason;
		statusCode?: number;
	};

	export type RetryLogEvent = RetryScheduledEvent | RetriesExhaustedEvent;

	export type RetryLogger = {
		debug: (event: RetryScheduledEvent) => void;
		warn: (event: RetriesExhaustedEvent) => void;
	};

	export type BackoffContext = {
		error?: unknown;
		init?: RequestInit;
		input: FetchInput;
		response?: globalThis.Response;
		retryNumber: number;
	};

	export type BackoffStrategy = (context: BackoffContext) => number;

	export type FetchWithRetriesOptions = {
		backoffStrategy?: BackoffStrategy;
		maximumAttempts?: number;
		retryPatchRequests?: boolean;
		retryPostRequests?: boolean;
	};

	export function createFetchWithRetries(
		logger: RetryLogger,
		options?: FetchWithRetriesOptions
	): typeof globalThis.fetch;
}
