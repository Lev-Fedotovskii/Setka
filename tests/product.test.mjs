import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyKind,recognizePalette} from '../src/import/kinds.js';
import {extractSources} from '../scripts/discover-mipt.mjs';
import {newState,migrateState} from '../src/storage.js';
import {DEFAULT_TERM} from '../src/domain/schedule.js';
import {catchUp} from '../src/domain/planner.js';
import {instant,notificationIntents,notificationDiff,notificationId} from '../src/domain/notifications.js';
import {sourceState,reconcileIds} from '../src/sources.js';
const style=rgb=>({fill:{rgb,pattern:'solid'}});
const lesson=(kind='lecture',id='lesson')=>({id,title:'Механика',kind,cohorts:[{groupId:'Б01-601'}],recurrence:{weekdays:[1],parity:'all',validFrom:'2026-09-01',validTo:'2026-12-31'},time:{startsAt:'09:00',endsAt:'10:25',slotNumbers:[1]},source:{rawText:'Механика',fingerprint:id},semanticKey:id});
const scheduled=()=>{const s=newState('2026-09-07');s.schedule={term:DEFAULT_TERM,institution:{timezone:'Europe/Moscow'},series:[lesson()]};s.generatedThrough={date:'2026-09-07',minute:0};return s;};
test('observed MIPT palette requires recognized profile; explicit text wins',()=>{
  assert.equal(classifyKind('Физика',style('FFFF99CC'),true).kind,'lecture');
  assert.equal(classifyKind('Физика',style('FFCCFFFF'),true).kind,'seminar');
  assert.equal(classifyKind('Химия',style('FFFFFF99'),true).kind,'practice');
  assert.equal(classifyKind('Химия (с)',style('FFFFFF99'),true).kind,'seminar');
  assert.equal(classifyKind('Лабораторный практикум',style('FFCCFFFF'),true).kind,'lab');
  assert.equal(classifyKind('Физическая культура',style('FFFFFF99'),true).kind,'sport');
  assert.equal(classifyKind('Физика',style('FFFF99CC'),false).kind,'other');
  assert.equal(classifyKind('Физика',style('FF00B0F0'),true).kind,'other');
});
test('catalog discovery uses metadata, skips empty/exam/offsite links and survives markup changes',()=>{
  const html='<article><a href="/upload/БВО 1 КУРС ОСЕНЬ 2026-2027.xlsx">1 курс БВО</a><a href="/upload/Экзамен.xlsx">Экзамен</a><a href="https://evil.test/БВО 1 КУРС ОСЕНЬ 2026-2027.xlsx">1 курс БВО</a></article>';
  const a=extractSources(html);assert.equal(a.length,1);assert.equal(a[0].program,'БВО');assert.equal(a[0].course,1);
  assert.equal(extractSources(html.replace('2026-2027.xlsx','2026-2027 новая.xlsx'))[0].id,a[0].id);
});
test('content hash detects same-URL changes, failures are not up to date',()=>{
  const s={importMeta:{hash:'a'}};assert.equal(sourceState(s,{status:'ok',sha256:'b'}),'update');assert.equal(sourceState(s,{status:'ok',sha256:'a'}),'current');assert.equal(sourceState(s,{status:'error',sha256:'a'}),'error');
});
test('lecture, seminar and practical follow-ups are linked, idempotent, due next class',()=>{
  for(const kind of ['lecture','seminar','lab','practice']){const s=scheduled();s.schedule.series[0].kind=kind;
    assert.equal(catchUp(s,{date:'2026-09-07',minute:600}),0);assert.equal(catchUp(s,{date:'2026-09-07',minute:625}),1);
    assert.equal(s.tasks[0].origin.date,'2026-09-07');assert.equal(s.tasks[0].origin.startsAt,'09:00');assert.equal(s.tasks[0].dueOn,'2026-09-14');assert.equal(s.tasks[0].status,'todo');
    assert.equal(catchUp(s,{date:'2026-09-07',minute:800}),0);assert.equal(s.tasks.length,1);
  }
});
test('no follow-ups for sport/unknown and no future materialization',()=>{
  for(const kind of ['sport','other']){const s=scheduled();s.schedule.series[0].kind=kind;assert.equal(catchUp(s,{date:'2026-09-07',minute:900}),0);}
  const s=scheduled();assert.equal(catchUp(s,{date:'2026-09-08',minute:900}),1);assert.equal(s.tasks.length,1);
});
test('migration preserves configured estimates and disabled rules',()=>{
  const s=scheduled();s.rules[2].enabled=false;s.rules[2].minutes=95;migrateState(s);assert.equal(s.rules[2].enabled,false);assert.equal(s.rules[2].minutes,95);assert.ok(s.rules[2].alsoKinds.includes('practice'));
});
test('notification policy applies timezone, quiet hours and suppresses completed sessions',()=>{
  const s=scheduled();s.notifications.enabled=true;const n=instant('2026-09-07',480);assert.equal(new Date(n).toISOString(),'2026-09-07T05:00:00.000Z');
  const intents=notificationIntents(s,n,1);assert.equal(intents.length,2);assert.equal(intents[0].at,instant('2026-09-07',530));
  s.notifications.quietEnd=600;assert.equal(notificationIntents(s,n,1).length,1);
  s.notifications.enabled=false;assert.deepEqual(notificationIntents(s,n,1),[]);
});
test('native rescheduling cancels removed/changed events and does not repeat unchanged alarms',()=>{
  const i={key:'lesson:a',at:123,title:'A'},pending=[{id:notificationId(i.key),extra:{signature:JSON.stringify(i)}}];
  assert.deepEqual(notificationDiff(pending,[i]),{cancel:[],schedule:[]});
  assert.equal(notificationDiff(pending,[{...i,at:456}]).cancel.length,1);assert.equal(notificationDiff(pending,[{...i,at:456}]).schedule.length,1);
  assert.equal(notificationDiff(pending,[]).cancel.length,1);
});
test('re-import keeps occurrence identity when matched source moves',()=>{
  const before={series:[lesson()]},after=structuredClone(before);after.series[0].id='moved-id';after.series[0].source.fingerprint='new-cell';assert.equal(reconcileIds(before,after).series[0].id,'lesson');
});
