import {readXlsx} from './import/xlsx.js';
import {inferMipt,applyOverrides,importDiff} from './import/mipt.js';
export const PUBLIC_URL='https://lev-fedotovskii.github.io/Setka/';
export function sourceState(schedule,source){
  if(!source)return 'missing';if(source.status!=='ok')return 'error';
  return schedule?.importMeta.hash===source.sha256?'current':'update';
}
export async function loadCatalog(base){
  const r=await fetch(new URL('data/catalog.json',base),{cache:'no-store'});if(!r.ok)throw Error('Каталог пока недоступен');
  const catalog=await r.json();if(catalog.schemaVersion!==1||!Array.isArray(catalog.sources)||!catalog.sources.length)throw Error('Неизвестный формат каталога');
  return catalog;
}
export async function sourceCandidate(source,base,state){
  if(!source.supported)throw Error('Эта книга в старом формате .xls. Автоимпорт пока поддерживает .xlsx.');
  if(!/^data\/workbooks\/[\w.-]+\.xlsx$/.test(source.path))throw Error('Некорректный адрес книги');
  const response=await fetch(new URL(source.path,base),{cache:'no-store'});if(!response.ok)throw Error('Книга недоступна');
  const ir=await readXlsx(await response.arrayBuffer(),source.filename);if(ir.hash!==source.sha256)throw Error('Версия книги не совпадает с каталогом. Повторите проверку позже.');
  const existing=state.schedule?.importMeta.source?.id===source.id;
  const schedule=applyOverrides(inferMipt(ir,existing?state.schedule.term:undefined),state.overrides);
  schedule.importMeta.source={id:source.id,label:source.label,program:source.program,course:source.course,academicYear:source.academicYear,term:source.term,url:source.url,checkedAt:source.checkedAt};
  return schedule;
}
export function selectedUpdate(candidate,state){
  const copy=structuredClone(candidate),old=state.schedule?.series||[],excluded=state.schedule?.importMeta.excluded||[];
  copy.series=copy.series.filter(s=>!s.blocked&&s.cohorts.some(c=>c.groupId===state.groupId)&&!excluded.includes(s.source.fingerprint)&&(!s.needsChoice||old.some(o=>o.source.fingerprint===s.source.fingerprint)));
  return copy;
}
export function reconcileIds(before,after){
  for(const item of importDiff(before,after))if(item.before&&item.after)item.after.id=item.before.id;
  return after;
}
