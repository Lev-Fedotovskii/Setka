import {addDays,clock} from './dates.js';
import {occurrences} from './schedule.js';
import {academicOccurrences,academicRange} from './individual-plan.js';
export const DEFAULT_RULES=[
  {id:'lecture-notes',kind:'lecture',title:'Разобрать материал лекции',minutes:30,enabled:true},
  {id:'seminar-homework',kind:'seminar',title:'Сделать ДЗ',minutes:60,enabled:true},
  {id:'lab-report',kind:'lab',alsoKinds:['practice'],title:'Оформить практикум',minutes:60,enabled:true}
];
export function ruleFor(rules,kind){
  if(kind==='other'||kind==='sport')return undefined;
  const rule=rules.find(r=>r.kind===kind)||rules.find(r=>r.alsoKinds?.includes(kind));
  return rule?.enabled?rule:undefined;
}
export function nextClassDate(state,event){
  for(let date=addDays(event.date,1);date<=(academicRange(state)?.endsOn||event.date);date=addDays(date,1)){
    if(academicOccurrences(state,date).some(e=>e.title===event.title&&e.kind===event.kind))return date;
  }
  return null;
}
export function followupTask(state,event,rule,key){
  return {id:key,title:`${rule.title} — ${event.title}`,estimatedMinutes:rule.minutes,remainingMinutes:rule.minutes,priority:3,splittable:true,minimumSessionMinutes:20,status:'todo',dueOn:nextClassDate(state,event),occurrenceId:event.id,
    origin:{seriesId:event.seriesId,occurrenceId:event.id,date:event.date,startsAt:clock(event.start),endsAt:clock(event.end),kind:event.kind,subject:event.title,source:structuredClone(event.source||null)},createdFromRule:rule.id};
}
