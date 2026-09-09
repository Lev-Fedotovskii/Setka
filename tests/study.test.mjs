import test from 'node:test';
import assert from 'node:assert/strict';
import {newState,migrateState,validateBackup} from '../src/storage.js';
import {startStudy,pauseStudy,resumeStudy,elapsedStudy,finishStudy,correctStudy,studySummary,estimateEvidence} from '../src/domain/study.js';
const at=Date.parse('2026-09-08T12:00:00Z');
test('timer survives serialization and pause/restart without counting paused time',()=>{
  let s=newState('2026-09-08');startStudy(s,{id:'a',at,subject:'Физика'});
  s=migrateState(JSON.parse(JSON.stringify(s)));assert.equal(elapsedStudy(s.activeStudy,at+60000),60000);
  pauseStudy(s,at+60000);assert.equal(elapsedStudy(s.activeStudy,at+600000),60000);
  resumeStudy(s,at+600000);assert.equal(elapsedStudy(s.activeStudy,at+660000),120000);
  finishStudy(s,{id:'a',at:at+660000,minutes:2,progress:0.25,unit:'темы'});
  assert.equal(s.measurements[0].measuredMs,120000);assert.equal(s.measurements[0].progress,0.25);assert.equal(s.activeStudy,null);validateBackup(s);
});
test('backward clock is flagged and no negative duration or duplicate completion appears',()=>{
  const s=newState('2026-09-08');startStudy(s,{id:'a',at});pauseStudy(s,at-60000);
  assert.equal(s.activeStudy.elapsedMs,0);assert.equal(s.activeStudy.clockChanged,true);
  const data={id:'a',at,minutes:3};finishStudy(s,data);finishStudy(s,data);assert.equal(s.measurements.length,1);
});
test('corrected measurements and flexible progress never rewrite task estimates or planned sessions',()=>{
  const s=newState('2026-09-08');s.tasks=[{id:'t',title:'Прочесть',status:'todo',estimatedMinutes:90,remainingMinutes:90,priority:3,splittable:true}];
  s.sessions=[{id:'s',taskId:'t',date:'2026-09-09',start:600,end:690,status:'planned'}];
  const personal=JSON.stringify([s.tasks,s.sessions]);
  for(let i=0;i<3;i++){startStudy(s,{id:String(i),at,taskId:'t',subject:'Физика'});finishStudy(s,{id:String(i),at,minutes:10,progress:0.5,unit:'темы'});}
  assert.equal(estimateEvidence(s,'физика','темы').minutesPerUnit,20);
  correctStudy(s,'0',{minutes:5,progress:0.25,unit:'темы',note:'Исправление',subject:'Физика'});
  assert.equal(s.measurements[0].corrections[0].measuredMs,600000);
  assert.equal(studySummary(s,'2026-09-08','2026-09-08')[0].measuredMs,25*60000);
  assert.equal(JSON.stringify([s.tasks,s.sessions]),personal);validateBackup(s);
});
test('legacy migration creates empty measurement storage, never treating plans as actual work',()=>{
  const s=newState('2026-09-08');delete s.measurements;delete s.activeStudy;migrateState(s);assert.deepEqual(s.measurements,[]);assert.equal(s.activeStudy,null);
  s.measurements=[{id:'bad',date:'2026-09-08',subject:'Физика',measuredMs:-1,progress:null}];assert.throws(()=>validateBackup(s),/измерения/);
});
