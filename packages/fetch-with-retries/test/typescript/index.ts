import {
	type BackoffContext,
	createFetchWithRetries,
	type FetchInput,
	type FetchWithRetriesOptions,
	type RetriesExhaustedEvent,
	type RetryLogger,
	type RetryScheduledEvent
} from '@financial-times/martech-fetch-with-retries';

const _stringInput: FetchInput = 'https://example.com';
const _urlInput: FetchInput = new URL('https://example.com');
const _requestInput: FetchInput = new Request('https://example.com');

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
	backoffStrategy(context: BackoffContext) {
		context.retryNumber;
		context.response?.status;
		context.input;

		return 0;
	},
	maximumAttempts: 4,
	retryPatchRequests: false,
	retryPostRequests: true
};

const fetchWithRetries = createFetchWithRetries(logger, options);
const defaultResponse = await fetchWithRetries('https://example.com');
const responseCheck: Response = defaultResponse;

_stringInput;
_urlInput;
_requestInput;
responseCheck.ok;
