import {DEFAULT_RULES} from './domain/followups.js';
import {DEFAULT_NOTIFICATIONS} from './domain/notifications.js';
import {validDate,minute} from './domain/dates.js';
import {semantics} from './import/mipt.js';
import {classifyKind} from './import/kinds.js';
import {storageKey} from './channel.js';
import {validateRecommendationSettings} from './domain/recommendation-windows.js';
export const STORAGE_KEY=storageKey('v1');
export function newState(date) {
  return {version:1,schedule:null,groupId:'Б01-601',tasks:[],sessions:[],events:[],measurements:[],activeStudy:null,overrides:{},generatedKeys:[],generatedThrough:{date,minute:0},settings:{dayStart:540,dayEnd:1260},notifications:{...DEFAULT_NOTIFICATIONS},rules:structuredClone(DEFAULT_RULES)};
}
export function loadState(date) {
  const raw=localStorage.getItem(STORAGE_KEY);if(!raw)return newState(date);
  const state=JSON.parse(raw);
  if(state.version!==1 || !['tasks','sessions','events','rules','generatedKeys'].every(k=>Array.isArray(state[k])) || !state.settings)throw Error('Сохранённые данные имеют неподдерживаемый формат.');
  migrateState(state);
  validateBackup(state);
  return state;
}
export function saveState(state){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}

export function validateBackup(s){
  if(!s||s.version!==1||!['tasks','sessions','events','rules','generatedKeys'].every(k=>Array.isArray(s[k])))throw Error('Неподдерживаемый формат.');
  if(!s.settings||!Number.isInteger(s.settings.dayStart)||!Number.isInteger(s.settings.dayEnd)||s.settings.dayStart<0||s.settings.dayEnd>1440||s.settings.dayStart>=s.settings.dayEnd)throw Error('Некорректные границы дня.');
  validateRecommendationSettings(s.settings);
  if(s.personalSelections!==undefined&&(!Array.isArray(s.personalSelections)||s.personalSelections.some(p=>typeof p.id!=='string'||!validDate(p.from)||!validDate(p.to)||p.from>p.to||!Array.isArray(p.weekdays)||p.weekdays.some(d=>!Number.isInteger(d)||d<1||d>7)||!Array.isArray(p.dates)||p.dates.some(d=>!validDate(d))||!s.academicSources?.[p.sourceId]?.schedule.series.some(e=>e.id===p.seriesId))))throw Error('Некорректный индивидуальный выбор.');
  if(s.academicSources)for(const source of Object.values(s.academicSources)){if(!source?.schedule)throw Error('Некорректный дополнительный источник.');validateBackup({...newState(source.schedule.term?.startsOn),schedule:source.schedule});}
  if(s.measurements!==undefined&&(!Array.isArray(s.measurements)||s.measurements.some(r=>typeof r.id!=='string'||!validDate(r.date)||typeof r.subject!=='string'||!Number.isFinite(r.measuredMs)||r.measuredMs<0||r.progress!==null&&(!Number.isFinite(r.progress)||r.progress<0||!r.unit))))throw Error('Некорректные измерения учёбы.');
  if(s.measurements&&new Set(s.measurements.map(r=>r.id)).size!==s.measurements.length)throw Error('Повторяющиеся измерения.');
  if(s.activeStudy&&(typeof s.activeStudy.id!=='string'||!Number.isFinite(s.activeStudy.startedAt)||!Number.isFinite(s.activeStudy.elapsedMs)||s.activeStudy.elapsedMs<0||s.activeStudy.runningSince!==null&&!Number.isFinite(s.activeStudy.runningSince)))throw Error('Некорректный таймер.');
  if(s.tasks.some(t=>typeof t.id!=='string'||typeof t.title!=='string'||!Number.isFinite(t.remainingMinutes)||t.remainingMinutes<0||!['todo','done'].includes(t.status)||!Number.isInteger(t.priority)||t.priority<1||t.priority>5||t.dueOn&&!validDate(t.dueOn)))throw Error('Некорректные задачи.');
  if(new Set(s.tasks.map(t=>t.id)).size!==s.tasks.length)throw Error('Повторяющиеся задачи.');
  if([...s.sessions,...s.events].some(e=>!validDate(e.date)||!Number.isInteger(e.start)||!Number.isInteger(e.end)||e.start<0||e.end>1440||e.start>=e.end))throw Error('Некорректные интервалы.');
  if(s.sessions.some(e=>!s.tasks.some(t=>t.id===e.taskId)||!['planned','done','skipped'].includes(e.status)))throw Error('Некорректные сессии.');
  if(s.schedule&&(!Array.isArray(s.schedule.series)||!validDate(s.schedule.term?.startsOn)||!validDate(s.schedule.term?.endsOn)||!validDate(s.schedule.term?.parityAnchor?.date)||!s.schedule.institution?.timezone||!s.schedule.bellSchedule?.slots))throw Error('Некорректное расписание.');
  if(s.schedule?.series.some(e=>typeof e.title!=='string'||!e.cohorts?.length||!e.recurrence?.weekdays?.length||!['all','odd','even'].includes(e.recurrence.parity)||!e.time?.slotNumbers||!e.source?.ranges||!e.confidence?.warnings||!/^\d\d:\d\d$/.test(e.time.startsAt)||minute(e.time.startsAt)>=minute(e.time.endsAt)))throw Error('Некорректные занятия.');
  if(s.rules.some(r=>typeof r.title!=='string'||!Number.isFinite(r.minutes)||r.minutes<=0)||s.generatedThrough&&!validDate(s.generatedThrough.date))throw Error('Некорректные правила.');
  if(typeof s.groupId!=='string'||s.generatedKeys.some(k=>typeof k!=='string'))throw Error('Некорректная группа или история заданий.');
  if(s.notifications){
    const n=s.notifications;
    if(['enabled','lessons','sessions','followups'].some(k=>typeof n[k]!=='boolean')||['lessonLead','sessionLead'].some(k=>!Number.isInteger(n[k])||n[k]<0||n[k]>60)||['quietStart','quietEnd'].some(k=>!Number.isInteger(n[k])||n[k]<0||n[k]>=1440))throw Error('Некорректные настройки уведомлений.');
  }
  if(s.events.some(e=>e.repeat&&e.repeat!=='weekly'||e.repeat==='weekly'&&(!validDate(e.repeatUntil)||e.repeatUntil<e.date)))throw Error('Некорректное повторение события.');
  if(s.events.some(e=>typeof e.id!=='string'||typeof e.title!=='string'))throw Error('Некорректные события.');
  if(s.events.some(e=>Object.entries(e.exceptions||{}).some(([d,p])=>!validDate(d)||!p.cancelled&&(!validDate(p.date)||typeof p.title!=='string'||!Number.isInteger(p.start)||!Number.isInteger(p.end)||p.start<0||p.end>1440||p.start>=p.end))))throw Error('Некорректное исключение личного события.');
  if(s.tasks.some(t=>t.repeat&&!['daily','weekly','monthly'].includes(t.repeat)||t.repeatUntil&&!validDate(t.repeatUntil)||t.dueTime&&!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t.dueTime)||t.reminderLead!==undefined&&(!Number.isInteger(t.reminderLead)||t.reminderLead< -1||t.reminderLead>1440)))throw Error('Некорректное повторение или напоминание задачи.');
  if(s.tasks.some(t=>typeof t.splittable!=='boolean'||!Number.isFinite(t.estimatedMinutes)||t.estimatedMinutes<=0))throw Error('Некорректная оценка задачи.');
  if(s.generatedThrough&&(!Number.isInteger(s.generatedThrough.minute)||s.generatedThrough.minute<0||s.generatedThrough.minute>=1440))throw Error('Некорректное время генерации.');
  if(s.schedule){
    const sc=s.schedule;
    if(sc.series.some(e=>e.recurrence.datesOnly&&(!Array.isArray(e.recurrence.includeDates)||!e.recurrence.includeDates.length||e.recurrence.includeDates.some(d=>!validDate(d)))))throw Error('Некорректные даты занятия.');
    if(sc.term.startsOn>sc.term.endsOn||!['odd','even'].includes(sc.term.parityAnchor.parity)||!Array.isArray(sc.groups)||!sc.importMeta||typeof sc.importMeta.workbook!=='string')throw Error('Некорректный семестр или источник.');
    try{new Intl.DateTimeFormat('en',{timeZone:sc.institution.timezone});}catch{throw Error('Некорректный часовой пояс.');}
    const validClock=t=>typeof t==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t);
    if(sc.series.some(e=>!validClock(e.time.startsAt)||!validClock(e.time.endsAt)||!validDate(e.recurrence.validFrom)||!validDate(e.recurrence.validTo)||!e.recurrence.weekdays.every(d=>Number.isInteger(d)&&d>=1&&d<=7)||!['lecture','seminar','lab','practice','class','sport','other'].includes(e.kind)||typeof e.id!=='string'||typeof e.source.rawText!=='string'||!Array.isArray(e.confidence.warnings)||!Array.isArray(e.time.slotNumbers)))throw Error('Некорректные поля занятия.');
  }
}

export function migrateState(state){
  state.measurements??=[];state.activeStudy??=null;
  state.notifications={...DEFAULT_NOTIFICATIONS,...state.notifications};
  for(const rule of state.rules){
    if(rule.id==='lab-report')rule.alsoKinds=['practice'];
    const defaultRule=DEFAULT_RULES.find(r=>r.id===rule.id);
    if(defaultRule&&['Оформить конспект','Решить домашнее задание','Подготовить отчёт'].includes(rule.title))rule.title=defaultRule.title;
  }
  if((state.productVersion||0)<3)for(const s of state.schedule?.series||[]){
    if(state.overrides?.[s.source.fingerprint]?.rawText===s.source.rawText)continue;
    if(s.source.adapter?.startsWith('mipt-dated'))continue;
    const parsed=semantics(s.source.rawText);
    s.title=parsed.title;s.location=parsed.location;s.instructors=parsed.instructors;
    if(s.kindEvidence?.method==='mipt-palette'){
      const classified=classifyKind(s.source.rawText,s.source.style,!!s.kindEvidence.profile);
      s.kind=classified.kind;s.kindEvidence=classified.evidence;
    }
  }
  state.productVersion=3;
  return state;
}
