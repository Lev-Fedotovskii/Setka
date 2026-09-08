import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {storageKey,CHANNEL} from '../src/channel.js';
test('development storage is explicitly namespaced, including recovery and notification ledger',()=>{
  assert.equal(CHANNEL,'unstable');assert.equal(storageKey('v1'),'setka.unstable.v1');
  assert.equal(storageKey('notifications.delivered'),'setka.unstable.notifications.delivered');
  assert.ok(!readFileSync('src/app.js','utf8').includes("localStorage.getItem('setka.v1')"));
});
test('Unstable worker activation removes only obsolete Unstable caches',async()=>{
  const handlers={},removed=[];
  const source=readFileSync('sw.js','utf8').replaceAll('__CACHE_PREFIX__','setkaUnstable-').replace('__BUILD_VERSION__','new').replace('__BUILD_FILES__','[]');
  vm.runInNewContext(source,{self:{addEventListener:(name,fn)=>handlers[name]=fn,clients:{claim:async()=>{}}},caches:{keys:async()=>['setka-stable','setkaUnstable-old','setkaUnstable-new','unrelated'],delete:async k=>removed.push(k)}});
  let done;handlers.activate({waitUntil:p=>done=p});await done;
  assert.deepEqual(removed,['setkaUnstable-old']);
});
