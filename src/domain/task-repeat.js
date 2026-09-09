import {addDays,validDate} from './dates.js';
export function nextRepeatDate(date,repeat,anchorDay=Number(date?.slice(8))){
  if(!validDate(date)||!repeat)return null;
  if(repeat==='daily')return addDays(date,1);
  if(repeat==='weekly')return addDays(date,7);
  if(repeat==='monthly'){
    const [y,m,d]=date.split('-').map(Number),first=new Date(Date.UTC(y,m,1)),last=new Date(Date.UTC(y,m+1,0)).getUTCDate();
    return `${first.getUTCFullYear()}-${String(first.getUTCMonth()+1).padStart(2,'0')}-${String(Math.min(anchorDay,last)).padStart(2,'0')}`;
  }
  return null;
}
// One current task per rhythm; next occurrence is explicit, no backlog explosion.
export function repeatCompletedTask(state,task,completedOn){
  if(!task.repeat||!validDate(completedOn))return;
  const root=task.repeatRoot||task.id;
  if(state.tasks.some(t=>t.repeatPrevious===task.id))return;
  const anchorDay=task.repeatAnchorDay||Number((task.dueOn||completedOn).slice(8));
  let date=nextRepeatDate(task.dueOn||completedOn,task.repeat,anchorDay);
  while(date&&date<=completedOn)date=nextRepeatDate(date,task.repeat,anchorDay);
  if(!date||task.repeatUntil&&date>task.repeatUntil)return;
  const id=`repeat:${root}:${date}`;
  if(state.tasks.some(t=>t.id===id))return;
  const copy=structuredClone(task);
  for(const key of ['completionUndo','completedOn','origin','occurrenceId','createdFromRule'])delete copy[key];
  Object.assign(copy,{id,repeatRoot:root,repeatPrevious:task.id,repeatAnchorDay:anchorDay,dueOn:date,status:'todo',remainingMinutes:task.estimatedMinutes});state.tasks.push(copy);
}
