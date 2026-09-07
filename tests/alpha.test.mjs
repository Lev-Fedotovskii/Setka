import test from 'node:test';
import assert from 'node:assert/strict';
import {semantics,applyOverrides,importDiff} from '../src/import/mipt.js';
import {classifyKind} from '../src/import/kinds.js';
import {newState,migrateState,validateBackup} from '../src/storage.js';
import {completeTask,reopenTask,previousWeekTasks,catchUp} from '../src/domain/planner.js';
import {DEFAULT_TERM,BELLS,dayEvents,occurrences} from '../src/domain/schedule.js';
import {ruleFor} from '../src/domain/followups.js';
const source={rawText:'Основы общей и неорганической химии-210, 211 БК',fingerprint:'cell',ranges:['CK10:CK13'],adapter:'mipt-xlsx-local/0.1'};
const series=()=>({id:'chem',semanticKey:'chem',title:'Основы общей и неорганической химии-210',kind:'practice',cohorts:[{groupId:'Б01-601'}],time:{startsAt:'09:00',endsAt:'10:25',slotNumbers:[1]},recurrence:{weekdays:[1],parity:'all',validFrom:DEFAULT_TERM.startsOn,validTo:DEFAULT_TERM.endsOn},source:{...source},confidence:{warnings:[]}});
const state=()=>{const s=newState('2026-09-07');s.schedule={series:[series()],term:structuredClone(DEFAULT_TERM),institution:{timezone:'Europe/Moscow'},bellSchedule:BELLS,groups:[{id:'Б01-601'}],importMeta:{workbook:'test.xlsx'}};return s;};
test('room list is stripped before comma metadata; hyphenated subjects survive',()=>{
 const p=semantics(source.rawText);assert.equal(p.title,'Основы общей и неорганической химии');assert.equal(p.location,'210, 211 БК');
 assert.equal(semantics('Социально-экономическая история').title,'Социально-экономическая история');
 assert.equal(semantics('Физика, доц. Иванов А.Б.-515 ГК').title,'Физика');
});
test('both instructor initial orders and multiple names remain visible data',()=>{
 assert.deepEqual(semantics('Физика, А. Б. Иванов, Петров-Водкин В.Г. — 515 ГК').instructors,['А. Б. Иванов','Петров-Водкин В.Г.']);
});
test('ordinary language/programming classes do not imply practical reports; explicit text wins',()=>{
 const style={fill:{rgb:'FFFF99',pattern:'solid'}};
 for(const title of ['Иностранный язык','Английский язык','Программирование','Информатика'])assert.equal(classifyKind(title,style,true).kind,'class');
 assert.equal(classifyKind('Программирование (л)',style,true).kind,'lecture');
 assert.equal(classifyKind('Программирование: лабораторный практикум',style,true).kind,'lab');
 assert.equal(classifyKind('Программирование',style,false).kind,'other');
 const s=state();assert.equal(ruleFor(s.rules,'class'),undefined);s.rules.push({kind:'other',enabled:true});assert.equal(ruleFor(s.rules,'other'),undefined);
 s.rules.push({kind:'practice',enabled:false});assert.equal(ruleFor(s.rules,'practice'),undefined);
});
test('compatible correction splits parity once, retains evidence and rejects changed source',()=>{
 const s=state(),original=s.schedule.series[0],odd={...original,recurrence:{...original.recurrence,parity:'odd'}},even={...original,title:'Другой вариант',recurrence:{...original.recurrence,parity:'even'}};
 const overrides={cell:{rawText:source.rawText,replacements:[odd,even]}};
 applyOverrides(s.schedule,overrides);applyOverrides(s.schedule,overrides);assert.equal(s.schedule.series.length,2);
 assert.equal(occurrences(s.schedule,s.groupId,'2026-09-07').length,1);assert.equal(s.schedule.series[1].source.rawText,source.rawText);
 const changed=state();changed.schedule.series[0].source.rawText='Изменено';applyOverrides(changed.schedule,overrides);assert.equal(changed.schedule.series.length,1);
});
test('withheld source with explicit user date/time can be scheduled and reimported',()=>{
 const s=state();s.schedule.series=[];s.schedule.importMeta.unresolved=[{sheet:'S',range:'E50',rawText:'Интенсив',reason:'Нет времени'}];
 const p={...series(),title:'Интенсив',recurrence:{...series().recurrence,datesOnly:true,includeDates:['2026-09-07']}};
 const o={'unresolved:S:E50':{rawText:'Интенсив',replacements:[p]}};applyOverrides(s.schedule,o);assert.equal(occurrences(s.schedule,s.groupId,'2026-09-07').length,1);assert.equal(occurrences(s.schedule,s.groupId,'2026-09-14').length,0);validateBackup(s);
});
test('completion can be reversed without reviving obsolete reservations',()=>{
 const s=state();s.tasks=[{id:'t',title:'T',status:'todo',estimatedMinutes:60,remainingMinutes:35}];s.sessions=[{id:'w',taskId:'t',status:'planned'}];
 completeTask(s,'t');completeTask(s,'t');reopenTask(s,'t');assert.equal(s.tasks[0].remainingMinutes,35);assert.equal(s.sessions[0].status,'skipped');
});
test('seven-day preview is bounded, opt-in, deduplicated and leaves live cursor untouched',()=>{
 const s=state();s.schedule.series[0].recurrence.weekdays=[1,2,3,4,5,6,7];s.generatedThrough={date:'2026-09-14',minute:800};const before=JSON.stringify(s);
 const proposed=previousWeekTasks(s,{date:'2026-09-14',minute:800});assert.equal(JSON.stringify(s),before);assert.ok(proposed.length<=30);assert.ok(proposed.every(t=>t.origin.date>='2026-09-07'));s.tasks.push(...proposed);s.generatedKeys.push(...proposed.map(t=>t.id));assert.equal(previousWeekTasks(s,{date:'2026-09-14',minute:800}).length,0);assert.equal(catchUp(s,{date:'2026-09-14',minute:800}),0);
});
test('migration fixes existing imports without replacing IDs or personal data; respects corrections',()=>{
 const s=state();s.tasks=[{id:'personal'}];migrateState(s);assert.equal(s.schedule.series[0].title,'Основы общей и неорганической химии');assert.equal(s.schedule.series[0].id,'chem');assert.equal(s.tasks[0].id,'personal');
 const corrected=state();corrected.overrides.cell={rawText:source.rawText,kind:'lecture'};migrateState(corrected);assert.equal(corrected.schedule.series[0].title,series().title);
 assert.equal(importDiff({series:[series()]},s.schedule)[0].type,'changed');
});
test('hidden lessons and weekly personal blocks resolve separately from university source',()=>{
 const s=state();s.schedule.series[0].hidden=true;assert.equal(occurrences(s.schedule,s.groupId,'2026-09-07').length,0);
 s.events=[{id:'lunch',title:'Обед',date:'2026-09-07',start:780,end:810,repeat:'weekly',repeatUntil:'2026-09-21'}];assert.equal(dayEvents(s,'2026-09-14').length,1);assert.equal(dayEvents(s,'2026-09-28').length,0);
});
