// Run after independently building the pinned Stable checkout and current Unstable.
import {cp,readFile,writeFile,rename,rm} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const stable=process.argv[2]||'_stable';
const pin='2bd0b444ab1dc6c0e3abd244b29a68dc338d0593';
assert.equal(execFileSync('git',['-C',stable,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),pin,'Stable checkout must be approved v0.3.2 commit');
assert.equal(JSON.parse(await readFile(`${stable}/package.json`)).version,'0.3.2');
assert.equal(JSON.parse(await readFile('dist/channel.json')).channel,'unstable');
// Temporary staging is inside the workspace; never delete a supplied checkout.
await rm('.channel-stage',{recursive:true,force:true});
await rename('dist','.channel-stage');
await cp(`${stable}/dist`,'dist',{recursive:true});
await rename('.channel-stage','dist/unstable');
// Hosting boundary only: no Stable application code or storage migration changes.
// Old Stable workers also cannot delete Unstable's deliberately distinct cache prefix.
let worker=await readFile('dist/sw.js','utf8');
assert.ok(worker.includes('const url=new URL(event.request.url);'));
worker=worker.replace('const url=new URL(event.request.url);',`const url=new URL(event.request.url);
  if(url.href.startsWith(new URL('unstable/',self.registration.scope).href))return;`);
await writeFile('dist/sw.js',worker);
await writeFile('dist/channel.json',JSON.stringify({channel:'stable',version:'0.3.2',commit:pin}));
assert.equal(await readFile('dist/app.js','utf8'),await readFile(`${stable}/dist/app.js`,'utf8'));
console.log('Stable 0.3.2 application preserved; Unstable isolated under unstable/.');
