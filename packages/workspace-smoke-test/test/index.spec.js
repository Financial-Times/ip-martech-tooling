import assert from 'node:assert/strict';
import test from 'node:test';

import { workspaceSmokeTest } from '../index.js';

test('workspace smoke test package is wired into the repo', () => {
	assert.strictEqual(workspaceSmokeTest(), 'workspace-smoke-test');
});
