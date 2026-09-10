import { BELLS, DEFAULT_TERM } from '../domain/schedule.js';
import { minute,addDays,monday,weekday,validDate } from '../domain/dates.js';
import { address } from './xlsx.js';
import {classifyKind,recognizePalette} from './kinds.js';
import {timingClarification} from './clarifications.js';
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
  const tail=/\s*[-–—]\s*((?:\d{1,4}[а-яА-Я]?(?:\s*[,/]\s*\d{1,4}[а-яА-Я]?)*\s*(?:[А-Яа-яЁё.]+)?|(?:Гл|Б|М)\.[А-Яа-яЁё.]+))\s*$/.exec(text);
  let location=tail?.[1]?.trim() || '';
  if(location.length>45 || /\d{1,2}:\d{2}/.test(location))location='';
  const subjectText=location?text.slice(0,tail.index):text;
  const namePattern=/(?:[А-ЯЁ][а-яё]+(?:-[А-ЯЁ][а-яё]+)?\s+[А-ЯЁ]\.\s*[А-ЯЁ]\.|[А-ЯЁ]\.\s*[А-ЯЁ]\.\s*[А-ЯЁ][а-яё]+(?:-[А-ЯЁ][а-яё]+)?)/g;
  const instructor=[...new Set(text.match(namePattern)||[])];
  let title=subjectText.split(',')[0].trim();
  for(const name of instructor)title=title.replace(name,'').trim();
  title=title.replace(/\s*(?:доцент|доц\.|профессор|проф\.|ст\.?\s*пр\.|преп\.)\s*$/i,'').replace(/[\s,;–—-]+$/,'');
  return {title,kind,location,instructors:instructor,parity:odd?'odd':even?'even':'all',warnings,blocked:odd&&even};
}
export function inferMipt(ir,term=DEFAULT_TERM) {
  const series=[],groups=new Map(),blocks=[],unresolved=[],bellTemplates=new Map();
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
        const template=JSON.stringify(times.map(({startsAt,endsAt})=>({startsAt,endsAt})));
        bellTemplates.set(template,(bellTemplates.get(template)||0)+1);
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
          series.push({id:`lesson-${stable(sourceKey)}`,semanticKey,title:parsed.title,kind:parsed.kind,kindEvidence:classification.evidence,cohorts,recurrence:{weekdays:[DAYS.indexOf(lower(day.normalizedText))+1],parity:parsed.parity,validFrom:term.startsOn,validTo:term.endsOn},time:{...time,slotNumbers},location:parsed.location,instructors:parsed.instructors,source:{adapter:'mipt-xlsx-local/0.1',sourceId:ir.hash,workbook:ir.name,sheet:sheet.name,ranges:[geometry.ref],rawText:cell.value,style:cell.style||null,fingerprint:stable(sourceKey)},confidence:{warnings},blocked,needsChoice:cohorts.some(c=>c.variant)||blocked||/подгр|\s\/\s/.test(lower(cell.value))});
        }
      }
    }
  }
  if(!groups.size || !series.length)return inferDatedMipt(ir,term);
  const primary=[...bellTemplates].sort((a,b)=>b[1]-a[1]||b[0].length-a[0].length)[0];
  const bellSchedule=primary?{id:'mipt-source-bells',validFrom:term.startsOn,slots:JSON.parse(primary[0]).map((t,i)=>({number:i+1,...t}))}:structuredClone(BELLS);
  const clarificationsApplied=[];
  for(const s of series){
    const clarification=timingClarification(s,term);
    if(clarification){s.time.startsAt=clarification.startsAt;s.source.timingClarification=clarification;clarificationsApplied.push(clarification.id);s.confidence.warnings=s.confidence.warnings.filter(w=>w!=='Занятие начинается внутри строки пары: время требует проверки.');s.confidence.warnings.push(clarification.evidence);}
    s.time.slotNumbers=bellSchedule.slots.filter(b=>minute(b.startsAt)<minute(s.time.endsAt)&&minute(b.endsAt)>minute(s.time.startsAt)).map(b=>b.number);
  }
  return {schemaVersion:'0.1',institution:{id:'mipt',name:'МФТИ',timezone:'Europe/Moscow'},term:structuredClone(term),bellSchedule,groups:[...groups.values()],series,importMeta:{workbook:ir.name,hash:ir.hash,blocks,unresolved,clarificationsApplied}};
}

// ФБВТ publishes concrete dates in week columns, with subject colors, not lesson-kind colors.
function inferDatedMipt(ir,term){
  const months=['январ','феврал','март','апрел','ма','июн','июл','август','сентябр','октябр','ноябр','декабр'];
  const series=[],unresolved=[],blocks=[],bells=new Map();
  const year=Number(/20\d{2}/.exec(ir.name)?.[0]||term.startsOn.slice(0,4));
  const cohort=/ФБВТ/i.test(ir.name)?'ФБВТ · 2 курс магистратуры':'Общий поток';
  let lastDate=term.endsOn;
  for(const sheet of ir.sheets){
    const headers=sheet.cells.filter(c=>/^\d+\s+недел/i.test(c.normalizedText));if(headers.length<3)continue;
    const headerRow=headers[0].row;
    const dateColumns=sheet.cells.filter(c=>c.row===headerRow).flatMap(c=>{
      const match=/(\d{1,2})\s*([а-я]+)?\s*[-–]\s*(\d{1,2})\s*([а-я]+)/i.exec(c.normalizedText);if(!match)return [];
      const month=months.findIndex(m=>lower(match[2]||match[4]).startsWith(m));if(month<0)return [];
      const start=`${year+(month<7?1:0)}-${String(month+1).padStart(2,'0')}-${match[1].padStart(2,'0')}`;
      return validDate(start)?[{col:c.col,start,monday:monday(start),ref:c.ref}]:[];
    });
    const dayLabels=['пн','вт','ср','чт','пт','сб','вс'];
    const days=sheet.cells.filter(c=>dayLabels.includes(lower(c.normalizedText))).sort((a,b)=>a.row-b.row);
    if(!dateColumns.length||!days.length)continue;
    const timeColumn=sheet.cells.find(c=>c.row===days[0].row&&parseTime(c.normalizedText))?.col;
    if(!timeColumn)continue;
    blocks.push({sheet:sheet.name,header:headers[0].ref,timeColumn:address(days[0].row,timeColumn),groups:[cohort],layout:'dated-weeks'});
    for(let i=0;i<days.length;i++){
      const day=days[i],end=days[i+1]?.row-1||Math.max(...sheet.cells.map(c=>c.row))+1;
      const times=sheet.cells.filter(c=>c.col===timeColumn&&c.row>=day.row&&c.row<end).flatMap(c=>{const time=parseTime(c.normalizedText);return time?[{row:c.row,...time}]:[];});
      times.forEach(t=>bells.set(t.startsAt,{startsAt:t.startsAt,endsAt:t.endsAt}));
      for(const cell of sheet.cells.filter(c=>dateColumns.some(d=>d.col===c.col)&&c.row>=day.row&&c.row<end&&/\p{L}/u.test(c.value))){
        const geometry=sheet.merges.find(m=>m.from.row===cell.row&&m.from.col===cell.col)||{from:cell,to:cell,ref:cell.ref};
        const slots=times.filter(t=>t.row>=geometry.from.row&&t.row<=geometry.to.row);
        const column=dateColumns.find(c=>c.col===cell.col),date=addDays(column.monday,dayLabels.indexOf(lower(day.normalizedText)));
        const reason=!slots.length?'В источнике не указано время':/^(Экзамены|Государственный праздник)$/i.test(cell.normalizedText)?'Общее примечание, без конкретного занятия':geometry.to.row>=end||geometry.to.col!==cell.col?'Неоднозначное объединение дат':null;
        if(reason){unresolved.push({sheet:sheet.name,range:geometry.ref,rawText:cell.value,reason});continue;}
        const dateCell=sheet.cells.find(c=>c.col===cell.col&&c.row===day.row-1),printedDay=parseInt(dateCell?.value,10);
        if(printedDay!==Number(date.slice(-2))){unresolved.push({sheet:sheet.name,range:geometry.ref,rawText:cell.value,reason:'Дата в строке не совпадает с заголовком недели'});continue;}
        const classification=classifyKind(cell.value,cell.style,false),parsed=semantics(cell.value);
        const lines=cell.value.split(/\n+/).map(s=>s.trim()).filter(Boolean),location=lines.find(s=>/^(Арктика|Климентовский|Долгопрудный|Сбер)(?:\s|,|$)/i.test(s))||'';
        const time={startsAt:slots[0].startsAt,endsAt:slots.at(-1).endsAt,slotNumbers:[]};
        const startOverride=/(?:^|\s)с\s+(\d{1,2}:\d{2})/.exec(cell.value);if(startOverride&&minute(startOverride[1])<minute(time.endsAt))time.startsAt=startOverride[1].padStart(5,'0');
        const sourceKey=`mipt:${term.id}:${sheet.name}:${geometry.ref}`,warnings=[...parsed.warnings,'Общий поток: номера групп в книге не указаны.'];
        if(classification.kind==='other')warnings.push('Цвет обозначает предмет; тип занятия нужно уточнить.');
        series.push({id:`lesson-${stable(sourceKey)}`,semanticKey:stable(cohort+'|'+date+'|'+lines[0]),title:lines[0],kind:classification.kind,kindEvidence:classification.evidence,cohorts:[{groupId:cohort}],recurrence:{weekdays:[weekday(date)],parity:'all',datesOnly:true,includeDates:[date],validFrom:term.startsOn,validTo:date>term.endsOn?date:term.endsOn},time,location,instructors:parsed.instructors,source:{adapter:'mipt-dated-weeks/0.2',sourceId:ir.hash,workbook:ir.name,sheet:sheet.name,ranges:[geometry.ref],rawText:cell.value,style:cell.style,fingerprint:stable(sourceKey)},confidence:{warnings},blocked:false,needsChoice:/\*|конкурс/i.test(cell.value)});
        if(date>lastDate)lastDate=date;
      }
    }
  }
  if(!series.length)throw Error('Не найдены блоки «Дни / Часы / группы» или датированные недели. Эта структура пока не поддерживается.');
  const bellSchedule={id:'mipt-dated-bells',validFrom:term.startsOn,slots:[...bells.values()].sort((a,b)=>a.startsAt.localeCompare(b.startsAt)).map((t,i)=>({number:i+1,...t}))};
  for(const s of series)s.time.slotNumbers=bellSchedule.slots.filter(b=>minute(b.startsAt)<minute(s.time.endsAt)&&minute(b.endsAt)>minute(s.time.startsAt)).map(b=>b.number);
  return {schemaVersion:'0.1',institution:{id:'mipt',name:'МФТИ',timezone:'Europe/Moscow'},term:{...structuredClone(term),endsOn:lastDate},bellSchedule,groups:[{id:cohort,label:cohort}],series,importMeta:{workbook:ir.name,hash:ir.hash,blocks,unresolved}};
}
export function importDiff(before,after) {
  const old=[...(before?.series||[])],changes=[];
  for(const s of after.series) {
    let i=old.findIndex(x=>x.semanticKey===s.semanticKey && x.source.fingerprint===s.source.fingerprint);
    if(i<0)i=old.findIndex(x=>x.source.fingerprint===s.source.fingerprint&&x.source.rawText===s.source.rawText&&x.id.split(':variant-')[1]===s.id.split(':variant-')[1]);
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
  for(const u of schedule.importMeta?.unresolved||[]){const key=`unresolved:${u.sheet}:${u.range}`,o=overrides[key];if(o?.rawText===u.rawText&&(!o.workbook||o.workbook===schedule.importMeta.workbook)&&o.replacements?.length&&!schedule.series.some(s=>s.source.fingerprint===key))schedule.series.push({source:{fingerprint:key,rawText:u.rawText,workbook:schedule.importMeta.workbook,sheet:u.sheet,ranges:[u.range]},id:key});}
  const replaced=new Set();
  const baselines=new Map();
  for(const s of schedule.series)if(!baselines.has(s.source.fingerprint))baselines.set(s.source.fingerprint,s.sourceBaseline||schedule.series.filter(x=>x.source.fingerprint===s.source.fingerprint&&x.time).map(x=>structuredClone(x)));
  schedule.series=schedule.series.flatMap(s=>{
    const o=overrides[s.source.fingerprint];
    if(o?.workbook&&o.workbook!==s.source.workbook)return [s];
    if(o?.rawText!==s.source.rawText){if(o)s.confidence?.warnings.push('Источник изменился: прежнее личное уточнение требует повторной проверки.');return [s];}
    if(o.replacements&&replaced.has(s.source.fingerprint))return [];
    if(o.replacements)replaced.add(s.source.fingerprint);
    if(o.replacements)return o.replacements.map((p,i)=>({...structuredClone(s),...structuredClone(p),id:i?`${s.id}:variant-${i}`:s.id,source:s.source,sourceBaseline:structuredClone(baselines.get(s.source.fingerprint)),blocked:false,needsChoice:false,confidence:{warnings:['Личное уточнение по исходной записи.']}}));
    if(o.kind)s.kind=o.kind;return [s];
  });
  return schedule;
}
