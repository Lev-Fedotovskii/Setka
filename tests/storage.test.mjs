import test from 'node:test';
import assert from 'node:assert/strict';
import {newState,validateBackup} from '../src/storage.js';
test('empty state survives backup serialization',()=>{
  const copy=JSON.parse(JSON.stringify(newState('2026-09-05')));
  assert.doesNotThrow(()=>validateBackup(copy));
});
test('restoration rejects impossible sessions and orphaned tasks',()=>{
  const s=newState('2026-09-05');s.sessions.push({id:'s',taskId:'missing',date:'2026-09-05',start:600,end:700,status:'planned'});assert.throws(()=>validateBackup(s),/сессии/);
  s.sessions[0].date='2026-02-31';assert.throws(()=>validateBackup(s),/интервалы/);
});
test('restoration rejects corrupt study bounds and catch-up cursor',()=>{
  const s=newState('2026-09-05');s.settings.dayEnd=100;assert.throws(()=>validateBackup(s),/границы/);
  s.settings.dayEnd=1260;s.generatedThrough.minute=NaN;assert.throws(()=>validateBackup(s),/время/);
});
