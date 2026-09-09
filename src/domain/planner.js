import { addDays, daysBetween, validDate } from './dates.js';
import { dayEvents, occurrences } from './schedule.js';
import {ruleFor,followupTask} from './followups.js';
import {repeatCompletedTask} from './task-repeat.js';
import {academicOccurrences,academicRange} from './individual-plan.js';
export function freeWindows(events, start=540, end=1260, minimum=20) {
  const occupied=events.filter(e=>e.end>start && e.start<end).map(e=>({start:Math.max(start,e.start),end:Math.min(end,e.end)})).sort((a,b)=>a.start-b.start);
  const result=[]; let cursor=start;
  for(const e of occupied){if(e.start-cursor>=minimum) result.push({start:cursor,end:e.start}); cursor=Math.max(cursor,e.end);}
  if(end-cursor>=minimum) result.push({start:cursor,end});
  return result;
}
export function unallocated(task,sessions) {
  return Math.max(0,task.remainingMinutes-sessions.filter(s=>s.taskId===task.id && s.status==='planned').reduce((n,s)=>n+s.end-s.start,0));
}
export function recommend(tasks,sessions,window,date,context={}) {
  const available=window.end-window.start;
  return tasks.filter(t=>t.status==='todo').flatMap(t=>{
    const left=unallocated(t,sessions), duration=Math.min(left,available);
    if(left<=0 || (!t.splittable && left>available) || duration<Math.min(t.minimumSessionMinutes||20,left))return [];
    const due=t.dueOn ? daysBetween(date,t.dueOn) : 999;
    const reason=due<0?'Срок прошёл':due===0?'Сдать сегодня':due===1?'Сдать завтра':due<=7?`Сдать через ${due} дн.`:'Без близкого срока';
    const subject=t.subject||t.origin?.subject,studied=(context.measurements||[]).filter(m=>m.subject===subject&&m.date>=addDays(date,-6)&&m.date<=date).reduce((n,m)=>n+m.measuredMs/60000,0);
    const balance=context.settings?.studyApproach==='balanced'&&subject&&due>1?Math.max(0,20-studied/30):0;
    const score=(due<0?120:due===0?100:due===1?80:due<=3?55:due<=7?25:0)+t.priority*8+(left<=available?15:0)+balance;
    return [{task:t,duration,reason:`${reason} · ${left<=available?'поместится целиком':'часть большой задачи'}${t.priority>=4?' · высокий приоритет':''}${balance?' · по предмету записано '+Math.round(studied)+' мин за 7 дней':''}`,score}];
  }).sort((a,b)=>b.score-a.score || a.task.id.localeCompare(b.task.id));
}
export function planSession(state,taskId,date,start,duration,now) {
  if(!validDate(date))throw Error('Проверьте дату.');
  const task=state.tasks.find(t=>t.id===taskId);
  if(!task || task.status!=='todo' || !Number.isInteger(duration) || duration<=0 || !Number.isInteger(start)) throw Error('Проверьте задачу и длительность.');
  if(date<now.date || (date===now.date && start<now.minute))throw Error('Нельзя запланировать работу в прошлом.');
  const left=unallocated(task,state.sessions);
  if(duration>left || (!task.splittable && duration!==left) || duration<Math.min(task.minimumSessionMinutes||20,left))throw Error('Длительность не соответствует оставшейся работе.');
  const windows=freeWindows(dayEvents(state,date),state.settings.dayStart,state.settings.dayEnd,1);
  if(!windows.some(w=>start>=w.start && start+duration<=w.end))throw Error('Это время уже занято или вне учебного дня.');
  const session={id:crypto.randomUUID(),taskId,date,start,end:start+duration,status:'planned'};
  state.sessions.push(session);return session;
}
export function finishSession(state,id,completedOn) {
  const s=state.sessions.find(s=>s.id===id);if(!s || s.status!=='planned')return;
  s.status='done';const t=state.tasks.find(t=>t.id===s.taskId);
  t.remainingMinutes=Math.max(0,t.remainingMinutes-(s.end-s.start));
  if(!t.remainingMinutes){t.status='done';if(completedOn){t.completedOn=completedOn;repeatCompletedTask(state,t,completedOn);}state.sessions.filter(x=>x.taskId===t.id && x.status==='planned').forEach(x=>x.status='skipped');}
}
export function completeTask(state,id,completedOn) {
  const t=state.tasks.find(t=>t.id===id);if(!t)return;
  if(t.status==='done')return;
  t.completionUndo={remainingMinutes:t.remainingMinutes,sessionIds:state.sessions.filter(s=>s.taskId===id&&s.status==='planned').map(s=>s.id)};
  t.status='done';t.remainingMinutes=0;
  if(completedOn){t.completedOn=completedOn;repeatCompletedTask(state,t,completedOn);}
  state.sessions.filter(s=>s.taskId===id && s.status==='planned').forEach(s=>s.status='skipped');
}
export function moveSession(state,id,date,start,duration,now){
  const existing=state.sessions.find(s=>s.id===id);if(!existing||existing.status!=='planned')throw Error('Можно изменить только запланированную работу.');
  const previous=structuredClone(state.sessions);
  try{state.sessions=state.sessions.filter(s=>s.id!==id);const next=planSession(state,existing.taskId,date,start,duration,now);next.id=id;return next;}
  catch(error){state.sessions=previous;throw error;}
}
export function reopenTask(state,id){
  const t=state.tasks.find(t=>t.id===id);if(!t||t.status!=='done')return;
  t.status='todo';t.remainingMinutes=t.completionUndo?.remainingMinutes||t.estimatedMinutes;
  // Restoring obsolete time reservations could introduce overlaps. Let the student replan.
  delete t.completionUndo;
}
// Explicit, reviewable catch-up is restricted to seven days and never advances the live cursor.
export function previousWeekTasks(state,now){
  const copy=structuredClone(state);copy.tasks=[];copy.generatedThrough={date:addDays(now.date,-7),minute:now.minute};
  catchUp(copy,now);return copy.tasks.slice(0,30);
}
// Cursor is persisted even when no rule fires. Enabling a rule is prospective.
export function catchUp(state,now) {
  const range=academicRange(state);if(!range)return 0;
  state.pendingAttendance??=[];state.attendance??={};
  for(const pending of state.pendingAttendance){
    if(state.attendance[pending.event.id]===undefined)continue;
    const rule=ruleFor(state.rules,pending.event.kind);
    if(state.attendance[pending.event.id]&&rule&&!state.generatedKeys.includes(pending.key)){state.tasks.push(followupTask(state,pending.event,rule,pending.key));state.generatedKeys.push(pending.key);}
  }
  state.pendingAttendance=state.pendingAttendance.filter(p=>state.attendance[p.event.id]===undefined);
  let date=state.generatedThrough?.date || now.date;
  const old=state.generatedThrough || {date:now.date,minute:0};
  if(date>now.date)return 0;
  date=date<range.startsOn?range.startsOn:date;
  const last=now.date<range.endsOn?now.date:range.endsOn;
  let count=0;
  for(;date<=last;date=addDays(date,1))for(const e of academicOccurrences(state,date)) {
    if((date===old.date && e.end<=old.minute)||(date===now.date && e.end>now.minute))continue;
    const rule=ruleFor(state.rules,e.kind);if(!rule)continue;
    const key=`followup:${e.id}:${rule.id}`;
    if(state.generatedKeys.includes(key))continue;
    if(academicOccurrences(state,date).some(other=>other.id!==e.id&&e.start<other.end&&other.start<e.end)){
      if(state.attendance[e.id]===false)continue;
      if(state.attendance[e.id]!==true){if(!state.pendingAttendance.some(p=>p.key===key))state.pendingAttendance.push({key,event:structuredClone(e)});continue;}
    }
    state.generatedKeys.push(key);
    state.tasks.push(followupTask(state,e,rule,key));count++;
  }
  state.generatedThrough={...now};return count;
}
