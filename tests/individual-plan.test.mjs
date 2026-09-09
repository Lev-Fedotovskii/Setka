import test from 'node:test';
import assert from 'node:assert/strict';
import {newState} from '../src/storage.js';
import {academicOccurrences,addPersonalSelection,updatePersonalSource} from '../src/domain/individual-plan.js';
import {catchUp} from '../src/domain/planner.js';
import {DEFAULT_TERM,BELLS,dayEvents} from '../src/domain/schedule.js';
import {importDiff} from '../src/import/mipt.js';
const lesson=(id,title='Физика')=>({id,title,kind:'lecture',cohorts:[{groupId:'g'}],recurrence:{weekdays:[2],parity:'all',validFrom:'2026-09-01',validTo:'2026-12-31'},time:{startsAt:'10:00',endsAt:'11:00',slotNumbers:[1]},source:{fingerprint:id,rawText:title,workbook:'source',ranges:['A1']},confidence:{warnings:[]},semanticKey:id});
const schedule=(id,series)=>({term:DEFAULT_TERM,bellSchedule:BELLS,institution:{timezone:'Europe/Moscow'},series,groups:[{id:'g'}],importMeta:{hash:id,workbook:'source',source:{id}}});
test('cross-group choice hides only selected own series during chosen dates and can be undone',()=>{
  const state=newState('2026-09-08');state.groupId='g';state.schedule=schedule('own',[lesson('own')]);const extra=lesson('extra'),sc=schedule('external',[extra]);
  addPersonalSelection(state,sc,extra,{id:'choice',from:'2026-09-08',to:'2026-09-30',weekdays:[2],dates:[],hideSeriesIds:['own']});
  assert.equal(academicOccurrences(state,'2026-09-08').length,1);assert.equal(academicOccurrences(state,'2026-09-08')[0].selectionId,'choice');assert.equal(academicOccurrences(state,'2026-10-06')[0].seriesId,'own');
  state.personalSelections[0].disabled=true;assert.equal(academicOccurrences(state,'2026-09-08')[0].seriesId,'own');
});
test('source updates retain selected identity, ranges, choices and missing lessons with warning',()=>{
  const state=newState('2026-09-08');const e=lesson('extra'),sc=schedule('source',[e]);addPersonalSelection(state,sc,e,{id:'choice',from:'2026-09-08',to:'2026-09-30',weekdays:[2],dates:[],hideSeriesIds:[]});
  const next=structuredClone(sc);next.series[0].location='New room';next.series[0].id='new-id';updatePersonalSource(state,'source',next,importDiff(sc,next));assert.equal(state.academicSources.source.schedule.series[0].id,'extra');assert.equal(state.personalSelections[0].to,'2026-09-30');
  updatePersonalSource(state,'source',{...next,series:[]},importDiff(state.academicSources.source.schedule,{...next,series:[]}));assert.deepEqual(state.academicSources.source.missing,['extra']);assert.equal(academicOccurrences(state,'2026-09-08').length,1);
});
test('overlapping lessons require attendance before generating followups and keep busy time',()=>{
  const state=newState('2026-09-08');state.groupId='g';state.schedule=schedule('own',[lesson('own')]);const e=lesson('extra','Математика');addPersonalSelection(state,schedule('external',[e]),e,{id:'choice',from:'2026-09-01',to:'2026-12-31',weekdays:[2],dates:[],hideSeriesIds:[]});
  catchUp(state,{date:'2026-09-08',minute:700});assert.equal(state.tasks.length,0);assert.equal(state.pendingAttendance.length,2);assert.equal(dayEvents(state,'2026-09-08').length,2);
  for(const p of state.pendingAttendance)state.attendance[p.event.id]=p.event.seriesId==='extra';
  catchUp(state,{date:'2026-09-08',minute:701});assert.equal(state.tasks.length,1);assert.equal(state.tasks[0].origin.subject,'Математика');catchUp(state,{date:'2026-09-08',minute:702});assert.equal(state.tasks.length,1);
});
