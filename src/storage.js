import {DEFAULT_RULES} from './domain/followups.js';
import {DEFAULT_NOTIFICATIONS} from './domain/notifications.js';
import {validDate,minute} from './domain/dates.js';
export const STORAGE_KEY='setka.v1';
export function newState(date) {
  return {version:1,schedule:null,groupId:'Б01-601',tasks:[],sessions:[],events:[],overrides:{},generatedKeys:[],generatedThrough:{date,minute:0},settings:{dayStart:540,dayEnd:1260},notifications:{...DEFAULT_NOTIFICATIONS},rules:structuredClone(DEFAULT_RULES)};
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
  if(s.events.some(e=>typeof e.id!=='string'||typeof e.title!=='string'))throw Error('Некорректные события.');
  if(s.tasks.some(t=>typeof t.splittable!=='boolean'||!Number.isFinite(t.estimatedMinutes)||t.estimatedMinutes<=0))throw Error('Некорректная оценка задачи.');
  if(s.generatedThrough&&(!Number.isInteger(s.generatedThrough.minute)||s.generatedThrough.minute<0||s.generatedThrough.minute>=1440))throw Error('Некорректное время генерации.');
  if(s.schedule){
    const sc=s.schedule;
    if(sc.series.some(e=>e.recurrence.datesOnly&&(!Array.isArray(e.recurrence.includeDates)||!e.recurrence.includeDates.length||e.recurrence.includeDates.some(d=>!validDate(d)))))throw Error('Некорректные даты занятия.');
    if(sc.term.startsOn>sc.term.endsOn||!['odd','even'].includes(sc.term.parityAnchor.parity)||!Array.isArray(sc.groups)||!sc.importMeta||typeof sc.importMeta.workbook!=='string')throw Error('Некорректный семестр или источник.');
    try{new Intl.DateTimeFormat('en',{timeZone:sc.institution.timezone});}catch{throw Error('Некорректный часовой пояс.');}
    const validClock=t=>typeof t==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t);
    if(sc.series.some(e=>!validClock(e.time.startsAt)||!validClock(e.time.endsAt)||!validDate(e.recurrence.validFrom)||!validDate(e.recurrence.validTo)||!e.recurrence.weekdays.every(d=>Number.isInteger(d)&&d>=1&&d<=7)||!['lecture','seminar','lab','practice','sport','other'].includes(e.kind)||typeof e.id!=='string'||typeof e.source.rawText!=='string'||!Array.isArray(e.confidence.warnings)||!Array.isArray(e.time.slotNumbers)))throw Error('Некорректные поля занятия.');
  }
}

export function migrateState(state){
  state.notifications={...DEFAULT_NOTIFICATIONS,...state.notifications};
  for(const rule of state.rules){
    if(rule.id==='lab-report')rule.alsoKinds=['practice'];
    const defaultRule=DEFAULT_RULES.find(r=>r.id===rule.id);
    if(defaultRule&&['Оформить конспект','Решить домашнее задание','Подготовить отчёт'].includes(rule.title))rule.title=defaultRule.title;
  }
  state.productVersion=2;
  return state;
}
