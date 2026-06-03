# Martech tooling

This repo contains shareable tooling and common packages for Martech engineers.

## Workspace layout

This repo uses npm workspaces for packages in `packages/*`.

Current workspace packages:

- `packages/fetch-with-retries`

The `scripts/` directory remains standalone and is not part of the workspace graph.

## Install

Install dependencies from the repo root:

```bash
npm install
```

## Commands

Run repo checks from the repo root:

```bash
npm run lint
npm test
```

Target the fetch-with-retries package directly:

```bash
npm run test -w packages/fetch-with-retries
```

## Publishing

`packages/fetch-with-retries` is configured to publish to Cloudsmith from CircleCI.

CircleCI project settings must include:

```bash
CLOUDSMITH_SERVICE_ACCOUNT=<your-service-account-id>
```

The publish workflow is triggered by tags in this format:

```bash
fetch-with-retries-v1.0.0
```

Publishing is package-scoped and runs:

```bash
npm publish --workspace packages/fetch-with-retries
```

## Contact

If you have any questions, or need any help, either [raise an issue](https://github.com/Financial-Times/ip-martech-tooling/issues), speak to [us on Slack](https://financialtimes.slack.com/archives/C017GUUCB3P), or via [email](mailto:ip.martech@ft.com).
