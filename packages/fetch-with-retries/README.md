# @financial-times/martech-fetch-with-retries

Retry native Node `fetch` calls with a shared default policy, configurable backoff, and structured retry logging.

- [Usage](#usage)
  - [Create a retrying fetch wrapper](#create-a-retrying-fetch-wrapper)
  - [Default behavior](#default-behavior)
  - [`createFetchWithRetries` configuration options](#createfetchwithretries-configuration-options)
    - [`options.maximumAttempts`](#optionsmaximumattempts)
    - [`options.backoffStrategy`](#optionsbackoffstrategy)
    - [`options.retryPostRequests`](#optionsretrypostrequests)
    - [`options.retryPatchRequests`](#optionsretrypatchrequests)
  - [Structured log events](#structured-log-events)
  - [TypeScript](#typescript)
  - [Publishing](#publishing)
- [License](#license)

## Usage

Install `@financial-times/martech-fetch-with-retries` as a dependency:

```bash
npm install --save @financial-times/martech-fetch-with-retries
```

If you’re installing the package on your local machine, you’ll need this in your `~/.npmrc` to point FT packages to our Cloudsmith registry:

```ini
@financial-times:registry=https://npm.packages.ft.com/financial-times-internal-releases/
//npm.packages.ft.com/financial-times-internal-releases/:_authToken=<your-cloudsmith-api-key>
```

Include in your code:

```js
import logger from "@dotcom-reliability-kit/logger";
import { createFetchWithRetries } from "@financial-times/martech-fetch-with-retries";
```

> [!TIP]
> If you’re using this package with TypeScript, we recommend using the following settings in your `tsconfig.json` file:
>
> ```json
> {
>   "module": "nodenext",
>   "moduleResolution": "nodenext"
> }
> ```

> [!IMPORTANT]
> This package assumes native Node `globalThis.fetch` is available. It does not wrap other HTTP clients.

### Create a retrying fetch wrapper

Create a wrapper once, then use it anywhere you would normally use `fetch`.

```js
import logger from "@dotcom-reliability-kit/logger";

const fetchWithRetries = createFetchWithRetries(logger);
const response = await fetchWithRetries("https://api.ft.com/content");
```

The logger passed to `createFetchWithRetries` must expose `debug(event)` and `warn(event)` methods. A `@dotcom-reliability-kit/logger` instance, or any other Pino-compatible logger. Creating a child logger is a useful way to attach consistent context to these internal retry logs.

### Default behavior

By default, the package:

- makes maximum `3` total attempts, including the initial request
- applies exponential backoff starting at `1000ms`
- retries `GET`, `HEAD`, `OPTIONS`, `PUT`, and `DELETE`
- retries responses with status `408`, `429`, `500`, `502`, `503`, and `504`
- retries errors thrown by `fetch`

When retries are exhausted:

- retryable HTTP responses are returned as the final response
- thrown fetch errors are rethrown

> [!WARNING]
> `POST` and `PATCH` are not retried by default. Only opt in when the upstream operation is safe to retry in your system.

### `createFetchWithRetries` configuration options

Configuration options can be passed into `createFetchWithRetries` to change the behavior of the wrapper.

#### `options.maximumAttempts`

Set the total number of attempts, including the first request. This option must be an integer greater than or equal to `1`.

```js
const fetchWithRetries = createFetchWithRetries(logger, {
  maximumAttempts: 5,
});
```

#### `options.backoffStrategy`

Customize the delay before the next retry. This option must be a function which accepts a single object argument and returns a non-negative finite number of milliseconds.

Expressed as a TypeScript type:

```ts
type BackoffContext = {
  error?: unknown;
  init?: RequestInit;
  input: string | URL | Request;
  response?: Response;
  retryNumber: number;
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
  },
});
```

> [!IMPORTANT]
> Providing `options.backoffStrategy` overrides the default delay calculation completely.

#### `options.retryPostRequests`

Opt into retrying `POST` requests for this wrapper instance.

```js
const fetchWithRetries = createFetchWithRetries(logger, {
  retryPostRequests: true,
});
```

#### `options.retryPatchRequests`

Opt into retrying `PATCH` requests for this wrapper instance.

```js
const fetchWithRetries = createFetchWithRetries(logger, {
  retryPatchRequests: true,
});
```

### Structured log events

The package emits structured retry events through the logger you provide.

> [!IMPORTANT]
> Full URLs, paths, and query strings are never logged. `inputHost` is derived from the original request input and may be `undefined`.

Retry scheduled event:

```js
{
    attemptsRemaining: 2,
    currentAttemptCount: 1,
    delayMs: 1000,
    event: 'FETCH_WITH_RETRIES_RETRY_SCHEDULED',
    inputHost: 'api.ft.com',
    method: 'GET',
    reason: 'response-status',
    statusCode: 503
}
```

Retries exhausted event:

```js
{
    attemptsRemaining: 0,
    currentAttemptCount: 3,
    errorMessage: 'socket hang up'
    errorName: 'TypeError',
    event: 'FETCH_WITH_RETRIES_RETRIES_EXHAUSTED',
    inputHost: 'api.ft.com',
    method: 'GET',
    reason: 'fetch-error',
}
```

### Publishing

Maintainers publish this package through CircleCI rather than from a local machine.

1. Update the version in `package.json`.
2. Update `CHANGELOG.md` for that version.
3. Open a PR to get those changes merged into the main branch.
4. When merged, create a GitHub release targeting the release commit, and use a matching tag:

```
fetch-with-retries-v1.0.0
```

5. CircleCI will run the tagged publish workflow.
6. If tests and lint pass, CircleCI publishes `@financial-times/martech-fetch-with-retries` to the `financial-times-internal-releases` Cloudsmith repository.

> [!IMPORTANT]
> The tag version must match the package version in `package.json`. The CircleCI workflow is triggered by the git tag itself, not by a GitHub release title.

## License

MIT
