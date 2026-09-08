import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const {version}=JSON.parse(readFileSync('package.json','utf8'));
assert.match(version,/^\d+\.\d+\.\d+-unstable\.\d+$/,'Development releases must be explicitly Unstable');
if(process.env.GITHUB_REF?.startsWith('refs/tags/'))assert.equal(process.env.GITHUB_REF,`refs/tags/v${version}`,'Tag must match package version');
assert.notEqual(process.env.SETKA_CHANNEL,'stable','This workflow cannot publish Stable');
