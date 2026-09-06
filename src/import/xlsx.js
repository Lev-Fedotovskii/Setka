// XLSX container reader only. Layout and semantic inference live in mipt.js.
// JSZip is vendored for a network-free runtime. No macro/formula execution.
const elements=(node,name)=>Array.from(node.getElementsByTagNameNS('*',name));
const xml=text=>{const doc=new DOMParser().parseFromString(text,'application/xml');if(elements(doc,'parsererror').length)throw Error('Повреждён XML внутри XLSX.');return doc;};
export function coordinate(ref) {
  const m=/^([A-Z]+)(\d+)$/.exec(ref);if(!m)throw Error(`Некорректный адрес: ${ref}`);
  return {row:Number(m[2]),col:[...m[1]].reduce((v,c)=>v*26+c.charCodeAt(0)-64,0)};
}
export function address(row,col) {let s='';for(;col;col=Math.floor((col-1)/26))s=String.fromCharCode(65+(col-1)%26)+s;return s+row;}
export function range(ref){const [a,b=a]=ref.split(':');return {ref,from:coordinate(a),to:coordinate(b)};}
export async function readXlsx(buffer,name='schedule.xlsx') {
  if(buffer.byteLength>15*1024*1024)throw Error('Максимальный размер файла — 15 МБ.');
  if(!globalThis.JSZip)throw Error('Модуль XLSX не загрузился. Перезагрузите приложение.');
  const zip=await JSZip.loadAsync(buffer);
  const entries=Object.values(zip.files);
  if(entries.length>3000)throw Error('Слишком много частей в книге.');
  // Enforce decompressed-size limits before allocating worksheet strings.
  if(entries.some(e=>e._data?.uncompressedSize>20*1024*1024) || entries.reduce((n,e)=>n+(e._data?.uncompressedSize||0),0)>60*1024*1024)throw Error('Распакованная книга слишком велика.');
  const read=async p=>{const f=zip.file(p);if(!f)throw Error(`В книге отсутствует ${p}`);return xml(await f.async('string'));};
  const shared=zip.file('xl/sharedStrings.xml') ? elements(await read('xl/sharedStrings.xml'),'si').map(si=>elements(si,'t').map(t=>t.textContent).join('')) : [];
  const styles=zip.file('xl/styles.xml') ? await read('xl/styles.xml') : null;
  const fills=styles?elements(styles,'fill').map(f=>{
    const p=elements(f,'patternFill')[0],color=p&&elements(p,'fgColor')[0];
    return {pattern:p?.getAttribute('patternType')||'none',rgb:color?.getAttribute('rgb')||null,theme:color?.getAttribute('theme')||null,indexed:color?.getAttribute('indexed')||null,tint:color?.getAttribute('tint')||null};
  }):[];
  const xfs=styles?Array.from(elements(styles,'cellXfs')[0]?.children||[]):[];
  const workbook=await read('xl/workbook.xml'), relationships=await read('xl/_rels/workbook.xml.rels');
  const targets=new Map(elements(relationships,'Relationship').map(r=>[r.getAttribute('Id'),r.getAttribute('Target')]));
  const sheets=[];
  for(const sheet of elements(workbook,'sheet')) {
    const id=sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');
    let target=targets.get(id);if(!target)continue;
    target=target.startsWith('/')?target.slice(1):'xl/'+target;
    target=target.replaceAll('\\','/');
    const doc=await read(target);
    const cells=elements(doc,'c').flatMap(c=>{
      const ref=c.getAttribute('r'),type=c.getAttribute('t');
      const raw=elements(c,'v')[0]?.textContent ?? '';
      const value=type==='s'?shared[Number(raw)]||'':type==='inlineStr'?elements(c,'t').map(t=>t.textContent).join(''):raw;
      if(!value)return [];
      const styleId=c.getAttribute('s')||'0';
      return [{...coordinate(ref),ref,value,normalizedText:value.normalize('NFC').replace(/\s+/g,' ').trim(),styleId,style:{fill:fills[Number(xfs[Number(styleId)]?.getAttribute('fillId')||0)]||null},formula:elements(c,'f')[0]?.textContent}];
    });
    sheets.push({name:sheet.getAttribute('name'),cells,merges:elements(doc,'mergeCell').map(m=>range(m.getAttribute('ref')))});
  }
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer))).map(b=>b.toString(16).padStart(2,'0')).join('');
  return {name,hash,sheets};
}
