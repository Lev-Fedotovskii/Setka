import {nowInZone,addDays} from './dates.js';

export const subjectKey=title=>String(title||'').trim().toLocaleLowerCase('ru').replaceAll('ё','е').replace(/\s+/g,' ');
export function studySubjects(state){
  return [...new Set([...(state.schedule?.series||[]).map(s=>s.title),...state.tasks.map(t=>t.subject||t.origin?.subject),...(state.measurements||[]).map(s=>s.subject)].filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ru'));
}
export function elapsedStudy(timer,at){
  if(!timer)return 0;
  return timer.elapsedMs+(timer.runningSince===null?0:Math.max(0,at-timer.runningSince));
}
export function startStudy(state,{id,at,taskId=null,subject=''}){
  if(state.activeStudy)throw Error('Сначала завершите или отмените текущую учёбу.');
  if(!Number.isFinite(at)||typeof id!=='string')throw Error('Некорректное начало учёбы.');
  const task=state.tasks.find(t=>t.id===taskId);
  if(taskId&&!task)throw Error('Задача не найдена.');
  state.activeStudy={id,startedAt:at,runningSince:at,elapsedMs:0,taskId,subject:subject.trim()||task?.subject||task?.origin?.subject||'',clockChanged:false};
  return state.activeStudy;
}
export function pauseStudy(state,at){
  const timer=state.activeStudy;if(!timer||timer.runningSince===null)return;
  if(at<timer.runningSince)timer.clockChanged=true;
  timer.elapsedMs=elapsedStudy(timer,at);timer.runningSince=null;
}
export function resumeStudy(state,at){const t=state.activeStudy;if(t&&t.runningSince===null)t.runningSince=at;}
export function finishStudy(state,{id,at,minutes,subject,progress=null,unit='',note=''}){
  const existing=(state.measurements||[]).find(s=>s.id===id);if(existing)return existing;
  const timer=state.activeStudy;if(!timer||timer.id!==id)throw Error('Эта учёба уже завершена.');
  if(!Number.isFinite(minutes)||minutes<0||minutes>1440)throw Error('Укажите от 0 до 1440 минут. Долгую запись можно разделить.');
  if(progress!==null&&(!Number.isFinite(progress)||progress<0||!unit.trim()))throw Error('Для прогресса укажите неотрицательное количество и свою единицу.');
  const record={id,startedAt:timer.startedAt,endedAt:at,date:nowInZone('Europe/Moscow',new Date(at)).date,subject:subject?.trim()??timer.subject,taskId:timer.taskId,measuredMs:Math.round(minutes*60000),timerMs:elapsedStudy(timer,at),clockChanged:timer.clockChanged,progress,unit:unit.trim(),note:note.trim()};
  state.measurements??=[];state.measurements.push(record);state.activeStudy=null;return record;
}
export function correctStudy(state,id,fields){
  const record=state.measurements.find(s=>s.id===id);if(!record)throw Error('Запись не найдена.');
  if(!Number.isFinite(fields.minutes)||fields.minutes<0||fields.minutes>1440)throw Error('Проверьте длительность.');
  if(fields.progress!==null&&(!Number.isFinite(fields.progress)||fields.progress<0||!fields.unit.trim()))throw Error('Проверьте прогресс и единицу.');
  record.corrections??=[];record.corrections.push({measuredMs:record.measuredMs,progress:record.progress,unit:record.unit,note:record.note,subject:record.subject});
  Object.assign(record,{measuredMs:Math.round(fields.minutes*60000),progress:fields.progress,unit:fields.unit.trim(),note:fields.note.trim(),subject:fields.subject.trim()});
}
export function studySummary(state,from,to){
  const groups=new Map();
  for(const s of state.measurements||[]){
    if(s.date<from||s.date>to)continue;
    const key=subjectKey(s.subject)||'_free',g=groups.get(key)||{subject:s.subject||'Без предмета',measuredMs:0,records:0,progress:{}};
    g.measuredMs+=s.measuredMs;g.records++;
    if(s.progress!==null&&s.unit)g.progress[s.unit]=(g.progress[s.unit]||0)+s.progress;
    groups.set(key,g);
  }
  return [...groups.values()].sort((a,b)=>b.measuredMs-a.measuredMs);
}
export function estimateEvidence(state,subject,unit){
  const records=(state.measurements||[]).filter(s=>subjectKey(s.subject)===subjectKey(subject)&&s.unit===unit&&s.progress>0&&s.measuredMs>0);
  if(records.length<3)return null;
  const progress=records.reduce((n,s)=>n+s.progress,0),minutes=records.reduce((n,s)=>n+s.measuredMs/60000,0);
  return {records:records.length,minutes,progress,minutesPerUnit:minutes/progress,unit};
}
export function recentStudy(state,date){return studySummary(state,addDays(date,-6),date);}
