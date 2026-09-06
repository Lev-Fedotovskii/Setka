import { BELLS, DEFAULT_TERM } from '../domain/schedule.js';
import { minute } from '../domain/dates.js';
import { address } from './xlsx.js';
import {classifyKind,recognizePalette} from './kinds.js';
const DAYS=['понедельник','вторник','среда','четверг','пятница','суббота','воскресенье'];
const groupPattern=/^[ББBСCМM]\d{2}-\d{3}[а-яa-z]*$/iu;
const lower=s=>s.toLocaleLowerCase('ru').replaceAll('ё','е');
export function parseTime(text) {
  const m=/(\d{1,2})[:.]?(\d{2})\s*[-–—]\s*(\d{1,2})[:.]?(\d{2})/.exec(text);
  if(!m)return null;
  const start=`${m[1].padStart(2,'0')}:${m[2]}`,end=`${m[3].padStart(2,'0')}:${m[4]}`;
  if(Number(m[1])>23 || Number(m[3])>23 || Number(m[2])>59 || Number(m[4])>59 || minute(start)>=minute(end))return null;
  return {startsAt:start,endsAt:end};
}
function stable(text){let h=2166136261;for(const c of text)h=Math.imul(h^c.charCodeAt(0),16777619);return (h>>>0).toString(16);}
export function semantics(raw) {
  const text=raw.replace(/\s+/g,' ').trim(),norm=lower(text);
  const odd=/(?:^|[^а-я])неч(?:ет(?:н(?:ая|ые|ой|ую|ых|ым))?)?(?:\.|[^а-я]|$)/.test(norm);
  const even=/(?:^|[^а-я])чет(?:н(?:ая|ые|ой|ую|ых|ым))?(?:\.|[^а-я]|$)/.test(norm);
  const warnings=[];
  if(odd && even)warnings.push('В одной ячейке обе чётности: требуется разделить вручную.');
  if(/подгр|\s\/\s|\*|факультатив/.test(norm))warnings.push('Подгруппа, альтернатива или примечание: проверьте исходный текст.');
  let kind=/физическая культура/.test(norm)?'sport':/лаборатор|\bлаб\./.test(norm)?'lab':/лекци/.test(norm)?'lecture':/семинар/.test(norm)?'seminar':'other';
  let title=text.split(',')[0].trim();
  const tail=/\s*[-–]\s*([^–—]+)$/.exec(text);
  let location=tail?.[1]?.trim() || '';
  if(location.length>45 || /\d{1,2}:\d{2}/.test(location))location='';
  if(location && title.endsWith(tail[0]))title=title.slice(0,-tail[0].length);
  const instructor=text.match(/[А-ЯЁ][а-яё-]+\s+[А-ЯЁ]\.\s*[А-ЯЁ]\./g)||[];
  return {title,kind,location,instructors:instructor,parity:odd?'odd':even?'even':'all',warnings,blocked:odd&&even};
}
export function inferMipt(ir,term=DEFAULT_TERM) {
  const series=[],groups=new Map(),blocks=[],unresolved=[];
  for(const sheet of ir.sheets) {
    const palette=recognizePalette(sheet);
    const mergeAt=(r,c)=>sheet.merges.find(m=>r>=m.from.row && r<=m.to.row && c>=m.from.col && c<=m.to.col);
    const at=(r,c)=>sheet.cells.find(x=>x.row===r && x.col===c);
    const headers=sheet.cells.filter(c=>lower(c.normalizedText)==='дни');
    for(const header of headers) {
      const timeHeader=sheet.cells.find(c=>c.row===header.row && c.col>header.col && c.col<=header.col+3 && lower(c.normalizedText)==='часы');
      if(!timeHeader)continue;
      const nextHeader=headers.filter(c=>c.row===header.row && c.col>header.col).sort((a,b)=>a.col-b.col)[0];
      const endCol=nextHeader?nextHeader.col-1:Math.max(...sheet.cells.map(c=>c.col));
      const groupHeaders=sheet.cells.filter(c=>c.row===header.row && c.col>timeHeader.col && c.col<=endCol && groupPattern.test(c.normalizedText));
      if(!groupHeaders.length)continue;
      const mapped=groupHeaders.map(c=>{
        const merge=mergeAt(c.row,c.col),label=c.normalizedText.replace(/^B/,'Б').replace(/^C/,'С').replace(/^M/,'М');
        const item={id:label,start:c.col,end:merge?.to.col||c.col};
        groups.set(label,{id:label,label,columns:Array.from({length:item.end-item.start+1},(_,i)=>address(0,item.start+i).replace(/0$/,''))});
        return item;
      });
      const dayCells=sheet.cells.filter(c=>c.col===header.col && c.row>header.row && DAYS.includes(lower(c.normalizedText))).sort((a,b)=>a.row-b.row);
      blocks.push({sheet:sheet.name,header:header.ref,timeColumn:timeHeader.ref,groups:mapped.map(g=>g.id)});
      for(let di=0;di<dayCells.length;di++) {
        const day=dayCells[di],dayEnd=dayCells[di+1]?.row || 100000;
        const times=sheet.cells.filter(c=>c.col===timeHeader.col && c.row>=day.row && c.row<dayEnd).flatMap(c=>{const t=parseTime(c.normalizedText);return t?[{row:c.row,...t,merge:mergeAt(c.row,c.col)}]:[];}).sort((a,b)=>a.row-b.row);
        if(!times.length)continue;
        const last=times.at(-1),lastRow=last.merge?.to.row||last.row;
        for(const cell of sheet.cells.filter(c=>c.col>timeHeader.col && c.col<=endCol && c.row>=day.row && c.row<=lastRow)) {
          const geometry=mergeAt(cell.row,cell.col)||{from:{row:cell.row,col:cell.col},to:{row:cell.row,col:cell.col},ref:cell.ref};
          if(geometry.from.row!==cell.row || geometry.from.col!==cell.col)continue;
          const cohorts=mapped.filter(g=>g.start<=geometry.to.col && g.end>=geometry.from.col).map(g=>({groupId:g.id,...(g.end>g.start && !(geometry.from.col<=g.start && geometry.to.col>=g.end)?{variant:address(0,Math.max(g.start,geometry.from.col)).replace(/0$/,'')}: {})}));
          if(!cohorts.length)continue;
          const slots=times.filter((t,i)=>t.row<=geometry.to.row && (times[i+1]?.row || lastRow+1)>geometry.from.row);
          if(!slots.length){unresolved.push({sheet:sheet.name,range:geometry.ref,rawText:cell.value,reason:'Не определено время'});continue;}
          const parsed=semantics(cell.value),classification=classifyKind(cell.value,cell.style,palette);
          parsed.kind=classification.kind;
          const warnings=[...parsed.warnings,...classification.warnings];
          const blocked=parsed.blocked || /^\s*\*\s*$/.test(cell.value) || /^(?:зан[а-я]*тия (?:в|на)|день самоподготовки|сколково$)/i.test(cell.normalizedText);
          if(blocked)warnings.push('Эта запись не может быть импортирована без разделения или уточнения источника.');
          if(cohorts.some(c=>c.variant))warnings.push('Параллельный столбец группы. Это не признак чётности. Выберите свой вариант.');
          if(slots.some((t,i)=>geometry.from.row>t.row && i===0))warnings.push('Занятие начинается внутри строки пары: время требует проверки.');
          if(cell.formula)warnings.push('Значение формулы взято из сохранённого результата Excel.');
          if(parsed.kind==='other')warnings.push('Тип занятия не указан; автоматические задания отключены до выбора типа.');
          const explicit=parseTime(cell.normalizedText),time=explicit||{startsAt:slots[0].startsAt,endsAt:slots.at(-1).endsAt};
          const slotNumbers=BELLS.slots.filter(b=>minute(b.startsAt)<minute(time.endsAt) && minute(b.endsAt)>minute(time.startsAt)).map(b=>b.number);
          const sourceKey=`mipt:${term.id}:${sheet.name}:${geometry.ref}`;
          const semanticKey=stable([cohorts.map(c=>c.groupId+':'+(c.variant||'')).sort().join(','),DAYS.indexOf(lower(day.normalizedText))+1,parsed.parity,lower(parsed.title)].join('|'));
          series.push({id:`lesson-${stable(sourceKey)}`,semanticKey,title:parsed.title,kind:parsed.kind,kindEvidence:classification.evidence,cohorts,recurrence:{weekdays:[DAYS.indexOf(lower(day.normalizedText))+1],parity:parsed.parity,validFrom:term.startsOn,validTo:term.endsOn},time:{...time,slotNumbers},location:parsed.location,instructors:parsed.instructors,source:{adapter:'mipt-xlsx-local/0.1',sourceId:ir.hash,workbook:ir.name,sheet:sheet.name,ranges:[geometry.ref],rawText:cell.value,style:cell.style||null,fingerprint:stable(sourceKey)},confidence:{warnings},blocked,needsChoice:cohorts.some(c=>c.variant)||blocked||/подгр|\s\/\s|\*/.test(lower(cell.value))});
        }
      }
    }
  }
  if(!groups.size || !series.length)throw Error('Не найдены блоки «Дни / Часы / группы». Эта структура пока не поддерживается.');
  return {schemaVersion:'0.1',institution:{id:'mipt',name:'МФТИ',timezone:'Europe/Moscow'},term:structuredClone(term),bellSchedule:structuredClone(BELLS),groups:[...groups.values()],series,importMeta:{workbook:ir.name,hash:ir.hash,blocks,unresolved}};
}
export function importDiff(before,after) {
  const old=[...(before?.series||[])],changes=[];
  for(const s of after.series) {
    let i=old.findIndex(x=>x.semanticKey===s.semanticKey && x.source.fingerprint===s.source.fingerprint);
    if(i<0){const candidates=old.map((x,i)=>({x,i})).filter(({x})=>x.semanticKey===s.semanticKey);if(candidates.length===1)i=candidates[0].i;}
    if(i<0){changes.push({type:'added',after:s});continue;}
    const b=old.splice(i,1)[0];
    const changed=b.title!==s.title || b.kind!==s.kind || b.location!==s.location || JSON.stringify(b.time)!==JSON.stringify(s.time) || JSON.stringify(b.recurrence)!==JSON.stringify(s.recurrence) || JSON.stringify(b.cohorts)!==JSON.stringify(s.cohorts) || b.source.rawText!==s.source.rawText;
    changes.push({type:changed?'changed':'unchanged',before:b,after:s});
  }
  return [...changes,...old.map(before=>({type:'removed',before}))];
}
// Only reapply a correction if the exact source text still matches its evidence.
export function applyOverrides(schedule,overrides={}) {
  for(const s of schedule.series){const o=overrides[s.source.fingerprint];if(o?.rawText===s.source.rawText)s.kind=o.kind;}
  return schedule;
}
