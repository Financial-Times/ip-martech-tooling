# @financial-times/martech-fetch-with-retries

Retry native Node `fetch` calls with a shared default policy, configurable backoff, and structured retry logging.

* [Usage](#usage)
  * [Create a retrying fetch wrapper](#create-a-retrying-fetch-wrapper)
  * [Default behavior](#default-behavior)
  * [`createFetchWithRetries` configuration options](#createfetchwithretries-configuration-options)
    * [`options.maximumAttempts`](#optionsmaximumattempts)
    * [`options.backoffStrategy`](#optionsbackoffstrategy)
    * [`options.retryPostRequests`](#optionsretrypostrequests)
    * [`options.retryPatchRequests`](#optionsretrypatchrequests)
  * [Structured log events](#structured-log-events)
  * [TypeScript](#typescript)
* [License](#license)


## Usage

Install `@financial-times/martech-fetch-with-retries` as a dependency:

```bash
npm install --save @financial-times/martech-fetch-with-retries
```

If you are installing the package from FT's private Cloudsmith registry, configure your local `~/.npmrc` first:

```ini
@financial-times:registry=https://npm.packages.ft.com/financial-times-internal-releases/
//npm.packages.ft.com/financial-times-internal-releases/:_authToken=<your-cloudsmith-api-key>
```

Include in your code:

```js
import { createFetchWithRetries } from '@financial-times/martech-fetch-with-retries';
import logger from '@dotcom-reliability-kit/logger';
```

We recommend using [`@dotcom-reliability-kit/logger`](https://github.com/Financial-Times/dotcom-reliability-kit/tree/main/packages/logger#readme), or any other logger that is [Pino](https://getpino.io/)-compatible.

> [!TIP]
> If you're using this package with TypeScript, we recommend using the following settings in your `tsconfig.json` file:
>
> ```json
> {
>     "module": "nodenext",
>     "moduleResolution": "nodenext"
> }
> ```

> [!IMPORTANT]
> This package assumes native Node `globalThis.fetch` is available. It does not wrap other HTTP clients.

### Create a retrying fetch wrapper

Create a wrapper once, then use it anywhere you would normally use `fetch`.

```js
const fetchWithRetriesLogger = logger.createChildLogger({
    component: 'fetch-with-retries'
});

const fetchWithRetries = createFetchWithRetries(fetchWithRetriesLogger);
const response = await fetchWithRetries('https://api.ft.com/content');
```

The logger passed to `createFetchWithRetries` must expose `debug(event)` and `warn(event)` methods. A `@dotcom-reliability-kit/logger` instance, or any other Pino-compatible logger, is a good fit for this contract. Creating a child logger is a useful way to attach consistent context to these internal retry logs.

### Default behavior

By default, the package:

* makes `3` total attempts, including the initial request
* applies exponential backoff starting at `1000ms`
* retries `GET`, `HEAD`, `OPTIONS`, `PUT`, and `DELETE`
* retries responses with status `408`, `429`, `500`, `502`, `503`, and `504`
* retries errors thrown by `fetch`

When retries are exhausted:

* retryable HTTP responses are returned as the final response
* thrown fetch errors are rethrown

> [!WARNING]
> `POST` and `PATCH` are not retried by default. Only opt in when the upstream operation is safe to retry in your system.

### `createFetchWithRetries` configuration options

Configuration options can be passed into `createFetchWithRetries` to change the behavior of the wrapper.

#### `options.maximumAttempts`

Set the total number of attempts, including the first request. This option must be an integer greater than or equal to `1`.

```js
const fetchWithRetries = createFetchWithRetries(logger, {
    maximumAttempts: 5
});
```

#### `options.backoffStrategy`

Customize the delay before the next retry. This option must be a function which accepts a single object argument and returns a non-negative finite number of milliseconds.

Expressed as a TypeScript type:

```ts
type BackoffContext = {
    retryNumber: number;
    input: RequestInfo | URL;
    init?: RequestInit;
    response?: Response;
    error?: unknown;
};

type BackoffStrategy = (context: BackoffContext) => number;
```

```js
const fetchWithRetries = createFetchWithRetries(logger, {
    backoffStrategy({ retryNumber, response }) {
        if (response?.status === 429) {
            return 0;
        }

        return retryNumber * 250;
    }
});
```

> [!IMPORTANT]
> Providing `options.backoffStrategy` overrides the default delay calculation completely.

#### `options.retryPostRequests`

Opt in to retrying `POST` requests for this wrapper instance.

```js
const fetchWithRetries = createFetchWithRetries(logger, {
    retryPostRequests: true
});
```

#### `options.retryPatchRequests`

Opt in to retrying `PATCH` requests for this wrapper instance.

```js
const fetchWithRetries = createFetchWithRetries(logger, {
    retryPatchRequests: true
});
```

### Structured log events

The package emits structured retry events through the logger you provide.

> [!IMPORTANT]
> Full URLs, paths, and query strings are never logged. `inputHost` is derived from the original request input and may be `undefined`.

Retry scheduled event:

```js
{
    event: 'FETCH_WITH_RETRIES_RETRY_SCHEDULED',
    currentAttemptCount: 1,
    attemptsRemaining: 2,
    method: 'GET',
    inputHost: 'api.ft.com',
    delayMs: 1000,
    reason: 'response-status',
    statusCode: 503
}
```

Retries exhausted event:

```js
{
    event: 'FETCH_WITH_RETRIES_RETRIES_EXHAUSTED',
    currentAttemptCount: 3,
    attemptsRemaining: 0,
    method: 'GET',
    inputHost: 'api.ft.com',
    reason: 'fetch-error',
    errorName: 'TypeError',
    errorMessage: 'socket hang up'
}
```

### TypeScript

The wrapper returns `Promise<Response>` and includes public types for logger events, options, and backoff strategy context.

```ts
import {
    createFetchWithRetries,
    type FetchWithRetriesOptions,
    type RetryLogger
} from '@financial-times/martech-fetch-with-retries';

const logger: RetryLogger = {
    debug(event) {
        event.delayMs;
    },
    warn(event) {
        event.attemptsRemaining;
    }
};

const options: FetchWithRetriesOptions = {
    maximumAttempts: 4
};

const fetchWithRetries = createFetchWithRetries(logger, options);
const response = await fetchWithRetries('https://example.com');
response.ok;
```


## License

MIT
