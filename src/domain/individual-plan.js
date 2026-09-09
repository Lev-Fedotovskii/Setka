import {weekday,academicWeek,minute} from './dates.js';
export function academicRange(state){
  const terms=[state.schedule?.term,...Object.values(state.academicSources||{}).map(s=>s.schedule.term)].filter(Boolean);
  return terms.length?{startsOn:terms.map(t=>t.startsOn).sort()[0],endsOn:terms.map(t=>t.endsOn).sort().at(-1)}:null;
}

export function selectionApplies(selection,date){
  return !selection.disabled&&date>=selection.from&&date<=selection.to&&!selection.excludeDates?.includes(date)&&(selection.dates?.length?selection.dates.includes(date):!selection.weekdays?.length||selection.weekdays.includes(weekday(date)));
}
function resolve(schedule,groupId,date){
  if(!schedule||date<schedule.term.startsOn||date>schedule.term.endsOn)return [];
  const parity=academicWeek(date,schedule.term).parity;
  return schedule.series.filter(s=>!s.hidden&&(!groupId||s.cohorts.some(c=>c.groupId===groupId))&&date>=s.recurrence.validFrom&&date<=s.recurrence.validTo&&!s.recurrence.excludeDates?.includes(date)&&(s.recurrence.includeDates?.includes(date)||!s.recurrence.datesOnly&&s.recurrence.weekdays.includes(weekday(date))&&(s.recurrence.parity==='all'||s.recurrence.parity===parity))).map(s=>({...s,id:`${s.id}@${date}`,seriesId:s.id,date,start:minute(s.time.startsAt),end:minute(s.time.endsAt),type:'lesson'}));
}
export function academicOccurrences(state,date){
  const selections=(state.personalSelections||[]).filter(s=>selectionApplies(s,date)),hidden=new Set(selections.flatMap(s=>s.hideSeriesIds||[]));
  const own=resolve(state.schedule,state.groupId,date).filter(e=>!hidden.has(e.seriesId));
  const added=selections.flatMap(selection=>{
    const source=state.academicSources?.[selection.sourceId];if(!source)return [];
    return resolve(source.schedule,null,date).filter(e=>e.seriesId===selection.seriesId).map(e=>({...e,id:`individual:${selection.sourceId}:${e.id}`,selectionId:selection.id,sourceId:selection.sourceId,title:selection.subject||e.title,sourceStale:!!source.missing?.includes(e.seriesId),time:{...e.time,slotNumbers:(state.schedule?.bellSchedule||source.schedule.bellSchedule).slots.filter(b=>minute(b.startsAt)<e.end&&minute(b.endsAt)>e.start).map(b=>b.number)}}));
  });
  const seen=new Set();
  return [...own,...added].filter(e=>{const key=`${e.sourceId||state.schedule?.importMeta?.source?.id||e.source?.workbook}:${e.source?.fingerprint||e.seriesId}:${date}:${e.time.startsAt}:${e.title}`;if(seen.has(key))return false;seen.add(key);return true;}).sort((a,b)=>a.start-b.start);
}
export function addPersonalSelection(state,sourceSchedule,series,fields){
  const sourceId=sourceSchedule.importMeta.source.id;
  state.academicSources??={};state.personalSelections??=[];
  let source=state.academicSources[sourceId];
  if(!source){source=state.academicSources[sourceId]={schedule:{...structuredClone(sourceSchedule),series:[]},missing:[]};}
  if(!source.schedule.series.some(s=>s.id===series.id))source.schedule.series.push(structuredClone(series));
  state.personalSelections.push({id:fields.id,sourceId,seriesId:series.id,subject:fields.subject||series.title,from:fields.from,to:fields.to,weekdays:fields.weekdays,dates:fields.dates,excludeDates:[],hideSeriesIds:fields.hideSeriesIds||[]});
}
export function updatePersonalSource(state,sourceId,candidate,diff){
  const source=state.academicSources[sourceId];if(!source)return;
  const selectedIds=new Set(state.personalSelections.filter(s=>s.sourceId===sourceId).map(s=>s.seriesId));
  const series=[],missing=[];
  for(const id of selectedIds){
    const before=source.schedule.series.find(s=>s.id===id),match=diff.find(d=>d.before?.id===id);
    if(match?.after&&!match.after.blocked){const next=structuredClone(match.after);next.id=id;series.push(next);}
    else if(before){series.push(before);missing.push(id);}
  }
  source.schedule={...structuredClone(candidate),series};source.missing=missing;
}
