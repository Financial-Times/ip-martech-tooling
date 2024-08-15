import js from '@eslint/js';
import prettier from 'eslint-plugin-prettier';

export default [
	js.configs.recommended,
	{
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: {
				vi: 'readonly',
				describe: 'readonly',
				it: 'readonly',
				expect: 'readonly',
				beforeEach: 'readonly',
				afterEach: 'readonly',
				fetch: 'readonly',
				FileReader: 'readonly',
				document: 'readonly',
				localStorage: 'readonly',
				process: 'readonly',
				Buffer: 'readonly',
			},
		},
		plugins: {
			prettier: prettier,
		},
		rules: {
			'no-console': 'error',
			'no-unused-vars': 'error',
			'prettier/prettier': 'error',
		},
	},
];
