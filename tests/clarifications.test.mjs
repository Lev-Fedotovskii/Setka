import test from 'node:test';
import assert from 'node:assert/strict';
import {inferMipt,applyOverrides,importDiff} from '../src/import/mipt.js';
import {address,range} from '../src/import/xlsx.js';
import {timingClarification} from '../src/import/clarifications.js';
import {sourceState} from '../src/sources.js';
const raw='Введение в программирование, уч.асс. Гавва А.С.-706 КПМ';
const cell=(row,col,value)=>({row,col,value,normalizedText:value,ref:address(row,col)});
function book(text=raw){return {name:'БВО 1 КУРС ОСЕНЬ 2026-2027 г..xlsx',hash:'known-book',sheets:[{name:'Лист1',cells:[cell(3,87,'Дни'),cell(3,88,'Часы'),cell(3,89,'Б06-603'),cell(46,87,'Четверг'),cell(54,88,'1530 - 1655'),cell(56,88,'1705 - 1830'),cell(55,89,text)],merges:[range('CJ54:CJ55'),range('CJ56:CJ57'),range('CK55:CK57')]}]};}
test('confirmed B06-603 programming start uses 16:15, retains source end, identity and evidence',()=>{
  const s=inferMipt(book()),lesson=s.series[0];assert.equal(lesson.time.startsAt,'16:15');assert.equal(lesson.time.endsAt,'18:30');assert.equal(lesson.id,'lesson-c48fa7a8');assert.deepEqual(lesson.recurrence.weekdays,[4]);assert.equal(lesson.source.rawText,raw);assert.match(lesson.source.timingClarification.evidence,/студентом/);
  const old=structuredClone(s);old.series[0].time.startsAt='15:30';delete old.importMeta.clarificationsApplied;delete old.series[0].source.timingClarification;
  assert.equal(sourceState(old,{status:'ok',sha256:'known-book'}),'update');assert.equal(importDiff(old,s).filter(x=>x.type==='changed').length,1);
  assert.equal(sourceState(s,{status:'ok',sha256:'known-book'}),'current');
  const override={[lesson.source.fingerprint]:{workbook:lesson.source.workbook,rawText:raw,replacements:[{time:{...lesson.time,startsAt:'16:30'}}]}};
  assert.equal(applyOverrides(s,override).series[0].time.startsAt,'16:30','Personal timing remains authoritative');
});
test('no generalized half-row arithmetic or stale clarification applies to changed evidence',()=>{
  assert.equal(inferMipt(book(raw.replace('Гавва','Другой'))).series[0].time.startsAt,'15:30');
  const original=inferMipt(book()).series[0];original.time.startsAt='15:30';
  for(const change of [s=>s.cohorts[0].groupId='Б06-602',s=>s.recurrence.weekdays=[3],s=>s.source.ranges=['CK54:CK57'],s=>s.source.workbook='Другая книга.xlsx',s=>s.time.endsAt='16:55']){const x=structuredClone(original);change(x);assert.equal(timingClarification(x,{id:'mipt-2026-autumn'}),null);}
  assert.equal(timingClarification(original,{id:'mipt-2027-autumn'}),null);
});
