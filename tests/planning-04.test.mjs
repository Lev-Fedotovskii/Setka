import test from 'node:test';
import assert from 'node:assert/strict';
import {newState,validateBackup} from '../src/storage.js';
import {completeTask,reopenTask,planSession,moveSession} from '../src/domain/planner.js';
import {nextRepeatDate} from '../src/domain/task-repeat.js';
import {personalEvents,changePersonalEvent} from '../src/domain/personal-events.js';
import {notificationIntents} from '../src/domain/notifications.js';
import {rememberCorrection,undoCorrection} from '../src/domain/correction-history.js';
const task=()=>({id:'t',title:'Прочесть',dueOn:'2026-09-08',estimatedMinutes:60,remainingMinutes:60,status:'todo',priority:3,splittable:true,repeat:'daily'});
test('repeat completion creates one next future instance and undo/recompletion never duplicates it',()=>{
  const s=newState('2026-09-08');s.tasks=[task()];completeTask(s,'t','2026-09-10');assert.equal(s.tasks.length,2);assert.equal(s.tasks[1].dueOn,'2026-09-11');
  reopenTask(s,'t');completeTask(s,'t','2026-09-10');assert.equal(s.tasks.length,2);validateBackup(s);
  assert.equal(nextRepeatDate('2026-01-31','monthly',31),'2026-02-28');assert.equal(nextRepeatDate('2026-02-28','monthly',31),'2026-03-31');
});
test('moving planned work retains identity, counts its allocation once and rolls back conflicts',()=>{
  const s=newState('2026-09-08');s.tasks=[task()];const now={date:'2026-09-08',minute:540};const x=planSession(s,'t','2026-09-08',600,60,now);
  moveSession(s,x.id,'2026-09-09',700,45,now);assert.equal(s.sessions.length,1);assert.equal(s.sessions[0].id,x.id);
  s.events.push({id:'e',date:'2026-09-10',start:700,end:800,title:'Занято'});const before=JSON.stringify(s.sessions);assert.throws(()=>moveSession(s,x.id,'2026-09-10',710,45,now),/занято/);assert.equal(JSON.stringify(s.sessions),before);
});
test('personal weekly event can move once, cancel once, undo and retain full series',()=>{
  const s=newState('2026-09-08');s.events=[{id:'e',date:'2026-09-08',start:700,end:760,title:'Обед',repeat:'weekly',repeatUntil:'2026-12-31'}];
  changePersonalEvent(s,'e','once','2026-09-15',{date:'2026-09-16',start:720,end:780,title:'Обед позже'});
  assert.equal(personalEvents(s.events,'2026-09-15').length,0);assert.equal(personalEvents(s.events,'2026-09-16')[0].sourceDate,'2026-09-15');assert.equal(personalEvents(s.events,'2026-09-22').length,1);
  changePersonalEvent(s,'e','once','2026-09-22',{cancelled:true});assert.equal(personalEvents(s.events,'2026-09-22').length,0);delete s.events[0].exceptions['2026-09-22'];assert.equal(personalEvents(s.events,'2026-09-22').length,1);validateBackup(s);
});
test('explicit task deadline reminder respects completion and quiet hours',()=>{
  const s=newState('2026-09-08');s.notifications.enabled=true;s.tasks=[{...task(),dueTime:'15:00',reminderLead:60}];
  const at=Date.parse('2026-09-08T08:00:00Z');assert.equal(notificationIntents(s,at)[0].at,Date.parse('2026-09-08T11:00:00Z'));
  s.tasks[0].status='done';assert.equal(notificationIntents(s,at).length,0);
});
test('undo correction restores recurrence and identity without touching tasks or plans',()=>{
  const s=newState('2026-09-08'),original={id:'lesson',source:{fingerprint:'fp',rawText:'source',workbook:'file'},recurrence:{includeDates:['2026-09-08','2026-09-10']}};s.schedule={series:[original]};s.tasks=[task()];rememberCorrection(s,'fp');s.schedule.series[0].recurrence.includeDates=['2026-09-09'];s.overrides.fp={kind:'other'};undoCorrection(s,'fp');assert.deepEqual(s.schedule.series[0].recurrence.includeDates,['2026-09-08','2026-09-10']);assert.equal(s.schedule.series[0].id,'lesson');assert.equal(s.tasks.length,1);
});
