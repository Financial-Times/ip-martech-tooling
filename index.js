module.exports = {
	'env': {
		'es6': true,
		'node': true,
		'jest': true
	},
	'extends': ['eslint:recommended'],
	'plugins': [
		'@babel',
		'import',
		'jest',
		'destructuring-newline'
	],
	'globals': {
		'Atomics': 'readonly',
		'SharedArrayBuffer': 'readonly'
	},
	'parser': '@babel/eslint-parser',
	'parserOptions': {
		'requireConfigFile': false,
		'ecmaVersion': 2018,
		'sourceType': 'module',
		'babelOptions': { 'plugins': ['@babel/plugin-syntax-class-properties'] }
	},
	'rules': {
		'max-len': ['error', {
			'code': 100,
			'comments': 200,
			'ignoreTrailingComments': true,
			'ignoreStrings': true,
			'ignoreUrls': true
		}],
		'indent': ['error', 'tab'],
		'linebreak-style': ['error', 'unix'],
		'quotes': ['error', 'single'],
		'quote-props': ['error', 'consistent'],
		'require-yield': 'off',
		'semi': ['error', 'always'],
		'no-var': 2,
		'prefer-const': 2,
		'prefer-object-spread': 2,
		'object-curly-spacing': ['error', 'always'],
		'object-curly-newline': ['error', {
			'ObjectExpression': {
				'multiline': true,
				'minProperties': 3
			},
			'ObjectPattern': {
				'multiline': true,
				'minProperties': 3
			},
			'ImportDeclaration': { 'minProperties': 2 },
			'ExportDeclaration': {
				'multiline': true,
				'minProperties': 3
			}
		}],
		'object-property-newline': ['error', { 'allowAllPropertiesOnSameLine': false }],
		'destructuring-newline/object-property-newline': 2,
		'padding-line-between-statements': [
			'error',
			{
				'blankLine': 'always',
				'prev': '*',
				'next': ['if', 'try', 'return'] 
			},
			{
				'blankLine': 'always',
				'prev': ['block-like', 'expression'],
				'next': 'const'
			},
			{
				'blankLine': 'always',
				'prev': 'const',
				'next': 'expression'
			}
		],
		'rest-spread-spacing': ['error', 'never'],
		'arrow-spacing': ['error', {
			'before': true,
			'after': true
		}],
		'comma-dangle': ['error', 'only-multiline'],
		'comma-spacing': ['error', {
			'before': false,
			'after': true
		}],
		'keyword-spacing': ['error', {
			'before': true,
			'after': true
		}],
		'space-infix-ops': ['error', { 'int32Hint': false }],
		'key-spacing': ['error', {
			'beforeColon': false,
			'afterColon': true
		}],
		'func-call-spacing': ['error', 'never'],
		'function-paren-newline': ['warn', 'multiline-arguments'],
		'function-call-argument-newline': ['warn', 'consistent'],
		'multiline-ternary': ['warn', 'always'],
		'space-in-parens': ['error', 'never'],
		'no-trailing-spaces': [2, { 'skipBlankLines': true }],
		'no-mixed-spaces-and-tabs': ['error', 'smart-tabs'],
		'space-before-blocks': ['error', 'always'],
		'space-before-function-paren': ['error', { 'asyncArrow': 'always' }],
		'padded-blocks': [
			'error',
			'never',
			{ 'allowSingleLineBlocks': true }
		],
		'brace-style': [
			'error',
			'1tbs',
			{ 'allowSingleLine': false }
		],
		'array-element-newline': ['error', { 'minItems': 3 }],
		'array-bracket-newline': ['error', { 'minItems': 3 }],
		'array-bracket-spacing': ['error', 'never'],
		'jest/no-disabled-tests': 'warn',
		'jest/no-focused-tests': 'error',
		'jest/no-identical-title': 'error',
		'jest/prefer-to-have-length': 'warn',
		'jest/valid-expect': 'warn'
	}
};
