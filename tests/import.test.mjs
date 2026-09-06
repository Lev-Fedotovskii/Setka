import test from 'node:test';
import assert from 'node:assert/strict';
import {inferMipt,parseTime,semantics,importDiff,applyOverrides} from '../src/import/mipt.js';
import {range,address} from '../src/import/xlsx.js';
const cell=(row,col,value)=>({row,col,value,normalizedText:value,ref:address(row,col)});
function workbook(shift=0){return {name:'test.xlsx',hash:'hash',sheets:[{name:'Schedule',cells:[cell(3,1+shift,'Дни'),cell(3,2+shift,'Часы'),cell(3,3+shift,'Б01-601'),cell(3,4+shift,'Б01-602а'),cell(4,1+shift,'Понедельник'),cell(4,2+shift,'900 - 1025'),cell(6,2+shift,'1035 - 1200'),cell(4,3+shift,'Физика, Иванов А.Б.-515 ГК')],merges:[range(`${address(4,3+shift)}:${address(7,4+shift)}`),range(`${address(4,2+shift)}:${address(5,2+shift)}`),range(`${address(6,2+shift)}:${address(7,2+shift)}`)]}]};}
test('time notation accepts actual compact MIPT format',()=>{
  assert.deepEqual(parseTime('900 - 1025'),{startsAt:'09:00',endsAt:'10:25'});
  assert.deepEqual(parseTime('9.00–10.25'),{startsAt:'09:00',endsAt:'10:25'});
  assert.equal(parseTime('29:00–30:00'),null);
});
test('shared lesson spans cohorts and variable-height slot regions',()=>{
  const s=inferMipt(workbook());assert.equal(s.series.length,1);assert.equal(s.groups.length,2);
  assert.deepEqual(s.series[0].time,{startsAt:'09:00',endsAt:'12:00',slotNumbers:[1,2]});
  assert.equal(s.series[0].cohorts.length,2);assert.equal(s.series[0].location,'515 ГК');assert.equal(s.series[0].kind,'other');
});
test('absolute column positions are not hard-coded',()=>{
  const s=inferMipt(workbook(28));assert.equal(s.series.length,1);assert.equal(s.series[0].cohorts[0].groupId,'Б01-601');assert.equal(s.series[0].source.ranges[0],'AE4:AF7');
});
test('independent horizontal blocks resolve their own times and weekdays',()=>{
  const a=workbook(),b=workbook(10);b.sheets[0].cells.find(c=>c.value==='Понедельник').value='Вторник';b.sheets[0].cells.find(c=>c.normalizedText==='Понедельник').normalizedText='Вторник';
  a.sheets[0].cells.push(...b.sheets[0].cells);a.sheets[0].merges.push(...b.sheets[0].merges);const s=inferMipt(a);assert.equal(s.importMeta.blocks.length,2);assert.deepEqual(s.series.map(x=>x.recurrence.weekdays[0]),[1,2]);
});
test('parallel physical group columns remain variants, never inferred parity',()=>{
  const w=workbook();w.sheets[0].cells=w.sheets[0].cells.filter(c=>c.ref!=='D3');w.sheets[0].merges=[range('C3:D3'),range('C4:C5'),range('B4:B5'),range('B6:B7')];
  const s=inferMipt(w).series[0];assert.equal(s.cohorts[0].variant,'C');assert.equal(s.recurrence.parity,'all');assert.equal(s.needsChoice,true);
});
test('explicit parity is contextual and preserves ambiguous text',()=>{
  assert.equal(semantics('Лабораторный практикум (неч.нед.)').parity,'odd');
  assert.equal(semantics('Лабораторный практикум (чет)').parity,'even');
  assert.equal(semantics('Четверг: физика').parity,'all');
  assert.equal(semantics('нечет физика / чет математика').blocked,true);
});
test('explicit event time overrides geometry',()=>{const w=workbook();w.sheets[0].cells.at(-1).value='Физика 09:15–11:50';w.sheets[0].cells.at(-1).normalizedText='Физика 09:15–11:50';assert.equal(inferMipt(w).series[0].time.startsAt,'09:15');});
test('same input is deterministic; room/time updates diff without deleting personal layer',()=>{
  const a=inferMipt(workbook()),b=inferMipt(workbook());assert.deepEqual(a,b);assert.equal(importDiff(a,b)[0].type,'unchanged');
  b.series[0].location='239 Квант';assert.equal(importDiff(a,b)[0].type,'changed');
  b.series[0].time.startsAt='09:15';assert.equal(importDiff(a,b)[0].type,'changed');
});
test('unrelated sheets fail explicitly rather than invent lessons',()=>assert.throws(()=>inferMipt({sheets:[{name:'Notes',cells:[],merges:[]}]}),/Не найдены/));
test('type corrections survive compatible re-import but not changed evidence',()=>{
  const s=inferMipt(workbook()),e=s.series[0],overrides={[e.source.fingerprint]:{kind:'lecture',rawText:e.source.rawText}};
  assert.equal(applyOverrides(s,overrides).series[0].kind,'lecture');
  const updated=inferMipt(workbook());updated.series[0].source.rawText='Changed source';assert.equal(applyOverrides(updated,overrides).series[0].kind,'other');
});
