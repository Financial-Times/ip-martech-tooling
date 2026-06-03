# Martech tooling

This repo contains shareable tooling and common packages for Martech engineers.

## Workspace layout

This repo uses npm workspaces for packages in `packages/*`.

Current workspace packages:

- `packages/workspace-smoke-test`

The `scripts/` directory remains standalone and is not part of the workspace graph.

## Install

Install dependencies from the repo root:

```bash
npm install
```

## Commands

Run workspace tests from the repo root:

```bash
npm test
```

Target the smoke-test package directly:

```bash
npm run test -w packages/workspace-smoke-test
```

## Contact

If you have any questions, or need any help, either [raise an issue](https://github.com/Financial-Times/ip-martech-tooling/issues), speak to [us on Slack](https://financialtimes.slack.com/archives/C017GUUCB3P), or via [email](mailto:ip.martech@ft.com).
