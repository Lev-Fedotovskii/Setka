import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {readWorkbook} from '../src/import/workbook.js';import {inferMipt,importDiff} from '../src/import/mipt.js';
import {occurrences} from '../src/domain/schedule.js';import {newState,validateBackup} from '../src/storage.js';
const cases=JSON.parse(await readFile(new URL('../fixtures/mipt/xls/cases.json',import.meta.url)));
const parsed=new Map();
for(const c of cases)test(`real XLS: ${c.filename}`,async()=>{
  const ir=await readWorkbook(await readFile(c.path),c.filename),r=inferMipt(ir);parsed.set(c.id,r);
  assert.equal(ir.hash,c.sha256);assert.equal(r.groups.length,c.groups);assert.equal(r.series.length,c.series);
  assert.ok(r.series.every(s=>s.source.rawText&&s.time.slotNumbers.length));
  const state=newState('2026-09-01');state.schedule=r;state.groupId=r.groups[0].id;validateBackup(state);
  assert.ok(importDiff(r,inferMipt(ir)).every(d=>d.type==='unchanged'));
});
test('XLS preserves observed fills and independent time columns',()=>{
  const r=parsed.get('mipt-70716429b751b00e'),byRange=ref=>r.series.find(s=>s.source.ranges[0]===ref);
  assert.equal(byRange('C20:J21').kind,'lecture');assert.equal(byRange('C22:C23').kind,'seminar');
  assert.equal(byRange('C18:C19').kind,'class');assert.equal(byRange('I16:I17').kind,'sport');
  assert.ok(r.importMeta.blocks.length>5);
});
test('small ФАКТ XLS recognizes pink/cyan and its actual bell times',()=>{
  const r=parsed.get('mipt-d22c69cdb4e92dad');
  assert.equal(r.series.find(s=>s.source.ranges[0]==='C46').kind,'lecture');
  assert.equal(r.series.find(s=>s.source.ranges[0]==='C47').kind,'seminar');
  assert.equal(r.bellSchedule.slots[1].startsAt,'10:45');
  assert.deepEqual(r.series.find(s=>s.source.ranges[0]==='C47').time.slotNumbers,[2]);
});
test('dated ФБВТ columns never become weekly recurrence or color-based lectures',()=>{
  const r=parsed.get('mipt-32b7b890afb5eee4'),s=r.series.find(s=>s.source.ranges[0]==='T3:T5');
  assert.equal(s.kind,'other');assert.deepEqual(s.recurrence.includeDates,['2026-12-28']);
  assert.equal(s.location,'Арктика 4.18');
  assert.ok(occurrences(r,r.groups[0].id,'2026-12-28').some(e=>e.seriesId===s.id));
  assert.ok(!occurrences(r,r.groups[0].id,'2026-12-21').some(e=>e.seriesId===s.id));
  assert.equal(r.series.find(s=>s.source.ranges[0]==='C24:C25').time.startsAt,'19:00');
  assert.equal(r.importMeta.unresolved.length,4);assert.ok(r.importMeta.unresolved.some(u=>u.range==='L40:L41'));
  assert.equal(r.bellSchedule.slots[0].startsAt,'10:45');
});
test('invalid and oversized workbook containers fail explicitly',async()=>{
  await assert.rejects(readWorkbook(new Uint8Array([1,2,3]).buffer),/Excel/);
  await assert.rejects(readWorkbook(new ArrayBuffer(16*1024*1024)),/15 МБ/);
});
