import {weekday,validDate} from './dates.js';
export function personalEvents(events,date){
  return events.flatMap(e=>{
    if(e.hidden)return [];
    const out=[],exceptions=e.exceptions||{};
    const recurs=e.repeat==='weekly'&&date>=e.date&&(!e.repeatUntil||date<=e.repeatUntil)&&weekday(date)===weekday(e.date);
    if((e.date===date||recurs)&&!exceptions[date])out.push({...e,id:e.repeat?`${e.id}@${date}`:e.id,eventId:e.id,sourceDate:date,date,type:'personal'});
    for(const [sourceDate,patch] of Object.entries(exceptions))if(!patch.cancelled&&(patch.date||sourceDate)===date)out.push({...e,...patch,id:`${e.id}@${sourceDate}`,eventId:e.id,sourceDate,date,type:'personal'});
    return out;
  });
}
export function changePersonalEvent(state,id,scope,sourceDate,fields){
  const e=state.events.find(e=>e.id===id);if(!e)throw Error('Событие не найдено.');
  if(!fields.cancelled&&(!fields.title?.trim()||!validDate(fields.date)||!Number.isInteger(fields.start)||!Number.isInteger(fields.end)||fields.start<0||fields.end>1440||fields.start>=fields.end))throw Error('Проверьте название, дату и время события.');
  if(scope==='once'&&e.repeat){e.exceptions??={};e.exceptions[sourceDate]=structuredClone(fields);}
  else if(fields.cancelled)e.hidden=true;
  else Object.assign(e,fields);
}
