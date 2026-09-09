import {addDays,nowInZone,clock} from './dates.js';
import {dayEvents} from './schedule.js';
import {instant,quietAt} from './notifications.js';
export function statusPlan(state,at=Date.now(),horizon=30){
  const zone=state.schedule?.institution.timezone||'Europe/Moscow',today=nowInZone(zone,new Date(at)).date,entries=[];
  for(let i=0;i<horizon;i++){
    const date=addDays(today,i),events=dayEvents(state,date).filter(e=>e.type!=='session'||e.status==='planned');
    const transitions=[...new Set([0,state.settings.dayStart,state.settings.dayEnd,state.notifications.quietStart,state.notifications.quietEnd,...events.flatMap(e=>[e.start,e.end])])].sort((a,b)=>a-b);
    for(const time of transitions){
      const current=events.filter(e=>e.start<=time&&e.end>time),next=events.find(e=>e.start>time),quiet=quietAt(time,state.notifications),outside=time<state.settings.dayStart||time>=state.settings.dayEnd;
      entries.push({at:instant(date,time,zone),show:!quiet&&!outside&&(current.length>0||!!next),title:current.length?current.map(e=>e.title).join(' / '):'Свободное время',body:`${date} · ${current.length?'до '+clock(Math.min(...current.map(e=>e.end))):'можно отдохнуть'}${next?' · дальше '+clock(next.start)+' '+next.title:' · больше событий нет'}`});
    }
  }
  return {entries,expiresAt:instant(addDays(today,horizon),0,zone)};
}
