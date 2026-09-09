import {addDays,clock,nowInZone} from './dates.js';
import {dayEvents,occurrences} from './schedule.js';
import {ruleFor} from './followups.js';
import {academicOccurrences} from './individual-plan.js';
export const DEFAULT_NOTIFICATIONS={enabled:false,lessons:true,sessions:true,followups:true,lessonLead:10,sessionLead:5,quietStart:1320,quietEnd:480};
export function quietAt(minute,settings){return settings.quietStart===settings.quietEnd?false:settings.quietStart>settings.quietEnd?minute>=settings.quietStart||minute<settings.quietEnd:minute>=settings.quietStart&&minute<settings.quietEnd;}
// Resolve civil schedule time to an instant without using the device timezone.
export function instant(date,minutes,timezone='Europe/Moscow'){
  const desired=Date.parse(`${date}T${clock(minutes)}:00Z`);let timestamp=desired;
  for(let i=0;i<3;i++){const local=nowInZone(timezone,new Date(timestamp));const actual=Date.parse(`${local.date}T${clock(local.minute)}:00Z`);timestamp+=desired-actual;}
  return timestamp;
}
export function notificationIntents(state,at=Date.now(),horizon=30){
  const prefs={...DEFAULT_NOTIFICATIONS,...state.notifications};if(!prefs.enabled)return [];
  const zone=state.schedule?.institution.timezone||'Europe/Moscow',now=nowInZone(zone,new Date(at)),out=[];
  for(const t of state.tasks){
    if(t.status!=='todo'||!t.dueOn||!t.dueTime||!Number.isFinite(t.reminderLead)||t.reminderLead<0)continue;
    const [h,m]=t.dueTime.split(':').map(Number),fireAt=instant(t.dueOn,h*60+m,zone)-t.reminderLead*60000,local=nowInZone(zone,new Date(fireAt));
    if(fireAt>at&&fireAt<at+horizon*86400000&&!quietAt(local.minute,prefs))out.push({key:`task:${t.id}`,at:fireAt,title:'Срок задачи',body:`${t.dueTime} · ${t.title}`,date:t.dueOn,view:'tasks'});
  }
  for(let day=0;day<horizon;day++){
    const date=addDays(now.date,day);
    for(const e of dayEvents(state,date)){
      if(e.type==='lesson'&&!prefs.lessons||e.type==='session'&&(!prefs.sessions||e.status!=='planned')||e.type==='personal')continue;
      const lead=e.type==='lesson'?prefs.lessonLead:prefs.sessionLead;
      const fireAt=instant(date,e.start,zone)-lead*60000,local=nowInZone(zone,new Date(fireAt));
      if(fireAt<=at||quietAt(local.minute,prefs))continue;
      out.push({key:`${e.type}:${e.id}`,at:fireAt,title:e.type==='lesson'?'Скоро занятие':'Время для задачи',body:`${clock(e.start)} · ${e.title}${e.location?' · '+e.location:''}`,date,view:'today'});
    }
    // One daily digest, after the last relevant lesson. Never one alert per task.
    const lessons=prefs.followups?academicOccurrences(state,date).filter(e=>ruleFor(state.rules,e.kind)):[];
    if(lessons.length){const end=Math.max(...lessons.map(e=>e.end)),fireAt=instant(date,end,zone)+60000;
      if(fireAt>at&&!quietAt(end+1,prefs))out.push({key:`followups:${date}`,at:fireAt,title:'Занятия завершены',body:'Откройте задачи: пора разобрать материал и подготовиться к следующим занятиям.',date,view:'tasks'});
    }
  }
  return out.sort((a,b)=>a.at-b.at||a.key.localeCompare(b.key)).slice(0,500);
}
export function notificationId(key){let hash=2166136261;for(const c of key)hash=Math.imul(hash^c.charCodeAt(0),16777619);return (hash>>>0)%2147483646+1;}
export function notificationDiff(pending,intents){
  const wanted=new Map(intents.map(i=>[notificationId(i.key),i]));
  return {cancel:pending.filter(p=>!wanted.has(p.id)||p.extra?.signature!==JSON.stringify(wanted.get(p.id))).map(p=>({id:p.id})),schedule:intents.filter(i=>!pending.some(p=>p.id===notificationId(i.key)&&p.extra?.signature===JSON.stringify(i)))};
}
