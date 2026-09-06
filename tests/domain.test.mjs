import test from 'node:test';
import assert from 'node:assert/strict';
import {academicWeek,addDays,nowInZone} from '../src/domain/dates.js';
import {DEFAULT_TERM,occurrences} from '../src/domain/schedule.js';
import {freeWindows,recommend,planSession,finishSession,completeTask,catchUp,unallocated} from '../src/domain/planner.js';
import {newState} from '../src/storage.js';
const lesson={id:'l1',title:'Physics',kind:'lecture',cohorts:[{groupId:'Б01-601'}],recurrence:{weekdays:[1],parity:'odd',validFrom:'2026-09-01',validTo:'2026-12-31'},time:{startsAt:'09:00',endsAt:'10:25'}};
const schedule={term:DEFAULT_TERM,series:[lesson]};
const task=(extra={})=>({id:'t1',title:'Report',remainingMinutes:90,estimatedMinutes:90,priority:3,splittable:true,minimumSessionMinutes:20,status:'todo',...extra});
test('academic parity uses Monday of anchor week, not ISO parity',()=>{
  assert.deepEqual(academicWeek('2026-09-01',DEFAULT_TERM),{number:1,parity:'odd'});
  assert.deepEqual(academicWeek('2026-09-07',DEFAULT_TERM),{number:2,parity:'even'});
  assert.equal(academicWeek('2026-08-30',DEFAULT_TERM).parity,'even');
  assert.equal(addDays('2026-12-31',1),'2027-01-01');
});
test('Moscow clock is independent of machine timezone',()=>assert.deepEqual(nowInZone('Europe/Moscow',new Date('2026-09-04T22:15:00Z')),{date:'2026-09-05',minute:75}));
test('occurrences honor term, weekday, parity and exceptions',()=>{
  assert.equal(occurrences(schedule,'Б01-601','2026-08-31').length,0);
  assert.equal(occurrences(schedule,'Б01-601','2026-09-07').length,0);
  assert.equal(occurrences(schedule,'Б01-601','2026-09-14').length,1);
  assert.equal(occurrences(schedule,'other','2026-09-14').length,0);
  const s=structuredClone(schedule);s.series[0].recurrence.excludeDates=['2026-09-14'];assert.equal(occurrences(s,'Б01-601','2026-09-14').length,0);
  s.series[0].recurrence.includeDates=['2026-09-15'];assert.equal(occurrences(s,'Б01-601','2026-09-15').length,1);
});
test('free windows union overlaps, nested intervals and clip bounds',()=>{
  assert.deepEqual(freeWindows([{start:500,end:600},{start:580,end:660},{start:600,end:630},{start:700,end:900}],540,840),[{start:660,end:700}]);
  assert.deepEqual(freeWindows([],540,600),[{start:540,end:600}]);
  assert.deepEqual(freeWindows([{start:540,end:590}],540,600),[]);
});
test('free windows never intersect arbitrary occupied intervals',()=>{
  let seed=17;const rnd=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)%1440);
  for(let i=0;i<100;i++){const busy=Array.from({length:20},()=>{let a=rnd(),b=rnd();return {start:Math.min(a,b),end:Math.max(a,b)};});for(const w of freeWindows(busy,540,1260)){assert.ok(w.end>w.start);assert.ok(!busy.some(b=>b.start<w.end&&b.end>w.start));}}
});
test('recommendations account for already planned work on other days',()=>{
  const t=task(),sessions=[{taskId:'t1',date:'2026-09-09',start:600,end:660,status:'planned'}];
  assert.equal(unallocated(t,sessions),30);
  assert.equal(recommend([t],sessions,{start:600,end:660},'2026-09-05')[0].duration,30);
  assert.equal(recommend([task({splittable:false})],[],{start:600,end:660},'2026-09-05').length,0);
  assert.equal(recommend([task({status:'done'})],[],{start:600,end:700},'2026-09-05').length,0);
  assert.equal(recommend([t],[],{start:600,end:615},'2026-09-05').length,0);
});
test('recommendation prioritizes near deadlines and returns evidence',()=>{
  const out=recommend([task({id:'later'}),task({id:'urgent',dueOn:'2026-09-06'})],[],{start:600,end:700},'2026-09-05');
  assert.equal(out[0].task.id,'urgent');assert.match(out[0].reason,/завтра/);
});
test('planning rejects past, overlaps, over-allocation, and unsplittable partial work',()=>{
  const s=newState('2026-09-05');s.tasks=[task()];const n={date:'2026-09-05',minute:600};
  assert.throws(()=>planSession(s,'t1',n.date,590,30,n),/прошлом/);
  planSession(s,'t1',n.date,600,60,n);
  assert.throws(()=>planSession(s,'t1',n.date,630,30,n),/занято/);
  assert.throws(()=>planSession(s,'t1',n.date,700,60,n),/Длительность/);
  assert.throws(()=>planSession(s,'t1',n.date,1300,30,n),/учебного/);
  s.tasks[0].splittable=false;assert.throws(()=>planSession(s,'t1',n.date,700,20,n),/Длительность/);
});
test('session completion counts work exactly once, task completion releases planned time',()=>{
  const s=newState('2026-09-05');s.tasks=[task()];const n={date:'2026-09-05',minute:500};
  const a=planSession(s,'t1',n.date,600,60,n);finishSession(s,a.id);finishSession(s,a.id);assert.equal(s.tasks[0].remainingMinutes,30);
  const b=planSession(s,'t1',n.date,700,30,n);completeTask(s,'t1');assert.equal(b.status,'skipped');assert.equal(s.tasks[0].status,'done');
});
test('follow-ups catch up elapsed lessons once and never materialize future tasks',()=>{
  const s=newState('2026-09-14');s.schedule=schedule;s.generatedThrough={date:'2026-09-14',minute:0};
  assert.equal(catchUp(s,{date:'2026-09-14',minute:600}),0);
  assert.equal(catchUp(s,{date:'2026-09-14',minute:625}),1);
  assert.equal(catchUp(s,{date:'2026-09-14',minute:700}),0);
  assert.equal(s.tasks.length,1);completeTask(s,s.tasks[0].id);
  assert.equal(catchUp(s,{date:'2026-09-29',minute:700}),1);assert.equal(s.tasks.length,2);
});
test('disabled rules do not backfill when enabled; sport creates nothing',()=>{
  const s=newState('2026-09-14');s.schedule=structuredClone(schedule);s.rules[0].enabled=false;
  catchUp(s,{date:'2026-09-14',minute:700});s.rules[0].enabled=true;assert.equal(catchUp(s,{date:'2026-09-14',minute:800}),0);
  s.schedule.series[0].kind='sport';assert.equal(catchUp(s,{date:'2026-09-29',minute:700}),0);
});
