import { academicWeek, weekday, minute } from './dates.js';
import {personalEvents} from './personal-events.js';
import {academicOccurrences} from './individual-plan.js';
export const DEFAULT_TERM = { id:'mipt-2026-autumn', title:'Осень 2026', startsOn:'2026-09-01', endsOn:'2026-12-31', parityAnchor:{ date:'2026-09-01', parity:'odd' } };
export const BELLS = { id:'mipt-2026-09', validFrom:'2026-09-01', slots:[['09:00','10:25'],['10:35','12:00'],['12:10','13:35'],['13:55','15:20'],['15:30','16:55'],['17:05','18:30'],['18:40','20:05']].map(([startsAt,endsAt],i)=>({number:i+1,startsAt,endsAt})) };
export function occurrences(schedule, groupId, date) {
  if (!schedule || date < schedule.term.startsOn || date > schedule.term.endsOn) return [];
  const parity = academicWeek(date, schedule.term).parity;
  return schedule.series.filter(s => !s.hidden && s.cohorts.some(c=>c.groupId===groupId) && date >= s.recurrence.validFrom && date <= s.recurrence.validTo && !s.recurrence.excludeDates?.includes(date) && (s.recurrence.includeDates?.includes(date) || (!s.recurrence.datesOnly && (s.recurrence.weekdays.includes(weekday(date)) && (s.recurrence.parity==='all' || s.recurrence.parity===parity))))).map(s=>({...s, id:`${s.id}@${date}`,seriesId:s.id,date,start:minute(s.time.startsAt),end:minute(s.time.endsAt),type:'lesson'})).sort((a,b)=>a.start-b.start || a.id.localeCompare(b.id));
}
export function dayEvents(state, date) {
  return [...academicOccurrences(state,date), ...personalEvents(state.events,date), ...state.sessions.filter(s=>s.date===date && s.status!=='skipped').map(s=>({...s,type:'session',title:state.tasks.find(t=>t.id===s.taskId)?.title || 'Работа над задачей',kind:'work'}))].sort((a,b)=>a.start-b.start);
}
export function overlaps(events) {
  return events.flatMap((a,i)=>events.slice(i+1).filter(b=>a.start<b.end && b.start<a.end).map(b=>[a,b]));
}
