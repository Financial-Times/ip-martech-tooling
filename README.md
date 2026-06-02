# Martech tooling

This repo contains shareable tooling and common packages for Martech engineers.

## Contents

- [Contents](#contents)
- [Workspace layout](#workspace-layout)
- [Install](#install)
- [Commands](#commands)
- [Targeting a single workspace](#targeting-a-single-workspace)
- [Publishing](#publishing)
- [Contact](#contact)

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

Run package checks from the repo root:

```bash
npm test
npm run lint
npm run test:unit
npm run test:end-to-end
npm run test:types
```

## Targeting a single workspace

Run commands for `packages/fetch-with-retries` only:

```bash
npm run test -w packages/fetch-with-retries
npm run test:types -w packages/fetch-with-retries
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
