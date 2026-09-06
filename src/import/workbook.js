import {readXlsx,coordinate,range} from './xlsx.js';
import {read,utils,set_cptable} from '../../vendor/xlsx.mjs';
import * as cptable from '../../vendor/cpexcel.full.mjs';
set_cptable(cptable);

export async function readWorkbook(buffer,name='schedule.xlsx'){
  if(buffer.byteLength>15*1024*1024)throw Error('Максимальный размер файла — 15 МБ.');
  const bytes=new Uint8Array(buffer);
  if(bytes[0]===0x50&&bytes[1]===0x4b)return readXlsx(buffer,name);
  if(![0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1].every((v,i)=>bytes[i]===v))throw Error('Выберите книгу Excel .xls или .xlsx.');
  let book;try{book=read(bytes,{type:'array',cellStyles:true,cellFormula:true,cellHTML:false});}catch{throw Error('Не удалось прочитать XLS. Проверьте, что книга не повреждена и не защищена паролем.');}
  if(book.SheetNames.length>100)throw Error('Слишком много листов в книге.');
  let count=0;
  const sheets=book.SheetNames.map(name=>{
    const sheet=book.Sheets[name],cells=[];
    for(const [ref,c]of Object.entries(sheet)){
      if(ref.startsWith('!')||c.v===undefined||c.v===null||String(c.v)==='')continue;
      if(++count>200000)throw Error('Слишком много заполненных ячеек в книге.');
      const value=String(c.w??c.v),s=c.s;
      cells.push({...coordinate(ref),ref,value,normalizedText:value.normalize('NFC').replace(/\s+/g,' ').trim(),formula:c.f,style:{fill:s?{pattern:s.patternType||'none',rgb:s.fgColor?.rgb||null,indexed:s.fgColor?.indexed??null}:null}});
    }
    const merges=(sheet['!merges']||[]).map(m=>range(utils.encode_range(m)));
    if(merges.length>100000)throw Error('Слишком много объединённых ячеек.');
    return {name,cells,merges};
  });
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer))).map(b=>b.toString(16).padStart(2,'0')).join('');
  return {name,hash,format:'xls',sheets};
}
