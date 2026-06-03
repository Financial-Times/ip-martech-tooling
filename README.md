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

Packages (e.g. `packages/fetch-with-retries`) are configured to publish from CircleCI to Cloudsmith after creating a GitHub release.

Publishing flow:

1. Update the package version, e.g. `packages/fetch-with-retries/package.json`.
2. Update the CHANGELOG for that version, e.g. `packages/fetch-with-retries/CHANGELOG.md`.
3. Open a PR to get those changes merged into the main branch.
4. When merged, create a GitHub release targeting the release commit, and use a matching tag in this format:

```
fetch-with-retries-v1.0.0
```

5. CircleCI will run the publish workflow for that tag.
6. If tests and lint pass, CircleCI publishes the package to the `financial-times-internal-releases` Cloudsmith repository.

> [!IMPORTANT]
> The tag version must match the package version in your `package.json`. The CircleCI workflow is triggered by the git tag itself, not by a GitHub release title.

## Contact

If you have any questions, or need any help, either [raise an issue](https://github.com/Financial-Times/ip-martech-tooling/issues), speak to [us on Slack](https://financialtimes.slack.com/archives/C017GUUCB3P), or via [email](mailto:ip.martech@ft.com).
