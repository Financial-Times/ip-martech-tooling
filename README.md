# eslint config

To use this config add `"eslint-config-martech": "github:financial-times/ip-martech-tooling#feat/MAR-1180"` as a devDependency in package.json. If you're using this config then you don't need to include eslint and eslint plugins as dependencies. They will be automatically included if you're using npm >7 as they are peerDependencies of this config. Once this config is installed you can add `"lint": "node_modules/.bin/eslint \"**/*.js\"",` as a script in package.json.

## Contact

If you have any questions, or need any help, either [raise an issue](https://github.com/Financial_times/ip-martech-tooling/issues), speak to [us on Slack](https://financialtimes.slack.com/archives/C017GUUCB3P), or via [email](mailto:ip.martech@ft.com).
