import {
	type BackoffContext,
	createFetchWithRetries,
	type FetchWithRetriesOptions,
	type RetriesExhaustedEvent,
	type RetryLogger,
	type RetryScheduledEvent
} from '@financial-times/martech-fetch-with-retries';

const logger: RetryLogger = {
	debug(event) {
		const retryEvent: RetryScheduledEvent = event;
		retryEvent.delayMs;
		retryEvent.currentAttemptCount;
		retryEvent.inputHost;
	},
	warn(event) {
		const exhaustedEvent: RetriesExhaustedEvent = event;
		exhaustedEvent.attemptsRemaining;
	}
};

const options: FetchWithRetriesOptions = {
	maximumAttempts: 4,
	retryPostRequests: true,
	retryPatchRequests: false,
	backoffStrategy(context: BackoffContext) {
		context.retryNumber;
		context.response?.status;
		return 0;
	}
};

const fetchWithRetries = createFetchWithRetries(logger, options);
const defaultResponse = await fetchWithRetries('https://example.com');
const responseCheck: Response = defaultResponse;
responseCheck.ok;
