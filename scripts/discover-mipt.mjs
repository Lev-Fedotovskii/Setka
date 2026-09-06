import {load} from 'cheerio';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
export const CATALOG_URL='https://mipt.ru/institute/departments/education_department/schedule';
const hash=b=>createHash('sha256').update(b).digest('hex');
export function extractSources(html) {
  const $=load(html),found=new Map();
  $('a[href]').each((_,a)=>{
    const label=$(a).text().replace(/\s+/g,' ').trim();if(!label)return;
    let url;try{url=new URL($(a).attr('href'),CATALOG_URL);}catch{return;}
    if(url.protocol!=='https:'||url.hostname!=='mipt.ru'||!/^\/upload\//.test(url.pathname)||!(/\.xlsx?$/i.test(url.pathname)))return;
    const filename=decodeURIComponent(url.pathname.split('/').at(-1)),text=(label+' '+filename).normalize('NFC');
    const year=text.match(/20\d{2}[-/](?:20)?\d{2}/)?.[0].replace('/','-');
    const term=/осен/i.test(text)?'autumn':/весн/i.test(text)?'spring':null;
    const course=Number(text.match(/(\d)\s*курс/i)?.[1]);
    if(!term||!year||!course)return; // Exam/retake lists are different source types.
    const program=/БВО/i.test(text)?'БВО':/СпВО/i.test(text)?'СпВО':/магистр/i.test(text)?'Магистратура':/бакалавр/i.test(text)?'Бакалавриат':'Другое';
    const school=text.match(/ФАКТ|ФПМИ|ФБВТ|ФРКТ|ФБМФ|ФЭФМ|ЛФИ/i)?.[0].toUpperCase()||null;
    const id='mipt-'+hash([program,course,school,year,term].join('|')).slice(0,16);
    const source={id,label,program,course,school,academicYear:year,term,url:url.href,filename};
    if(found.has(id)&&found.get(id).url!==source.url)throw Error(`Ambiguous source identity: ${label}`);
    found.set(id,source);
  });
  return [...found.values()].sort((a,b)=>a.id.localeCompare(b.id));
}
async function fetchOfficial(url,limit=15*1024*1024){
  let target=new URL(url);
  for(let i=0;i<5;i++){
    if(target.protocol!=='https:'||target.hostname!=='mipt.ru')throw Error('Non-MIPT redirect rejected');
    const r=await fetch(target,{redirect:'manual',signal:AbortSignal.timeout(45000),headers:{'User-Agent':'Setka schedule monitor (public university timetable)'}});
    if(r.status>=300&&r.status<400){target=new URL(r.headers.get('location'),target);continue;}
    if(!r.ok)throw Error(`MIPT returned ${r.status}`);
    if(Number(r.headers.get('content-length'))>limit)throw Error('Source exceeds size limit');
    const chunks=[];let size=0;for await(const chunk of r.body){size+=chunk.length;if(size>limit)throw Error('Source exceeds size limit');chunks.push(chunk);}
    return {bytes:Buffer.concat(chunks),headers:r.headers};
  }throw Error('Too many redirects');
}
function htmlStrings(value,out=[]){if(typeof value==='string'&&value.includes('<a'))out.push(value);else if(value&&typeof value==='object')Object.values(value).forEach(v=>htmlStrings(v,out));return out;}
export async function discover(){
  const page=(await fetchOfficial(CATALOG_URL)).bytes.toString();let sources=extractSources(page),method='html';
  if(!sources.length){
    // Public content API observed on the official page. Resolve the department ID each run.
    const department=JSON.parse((await fetchOfficial('https://mipt.ru/api/v1/?action=subdivisions.getItemDetail&lang=ru&code=education_department')).bytes);
    if(!Number.isInteger(department.id))throw Error('MIPT department API changed');
    const endpoint=`https://mipt.ru/api/v1/?action=blockPage.getItemsForPrimaryByPath&lang=ru&id=${department.id}&path=schedule`;
    const content=JSON.parse((await fetchOfficial(endpoint)).bytes);
    sources=extractSources(htmlStrings(content).join('\n'));method='public-content-api';
  }
  if(!sources.length)throw Error('No teaching timetable sources discovered; refusing to publish an empty catalog');
  return {sources,method};
}
export async function refreshCatalog(directory='data'){
  const checkedAt=new Date().toISOString(),{sources,method}=await discover();
  let previous={sources:[]};try{previous=JSON.parse(await readFile(`${directory}/catalog.json`));}catch{}
  await mkdir(`${directory}/workbooks`,{recursive:true});
  for(const source of sources){
    const old=previous.sources.find(s=>s.id===source.id);
    try{
      const {bytes,headers}=await fetchOfficial(source.url),sha256=hash(bytes);
      const format=bytes[0]===0x50&&bytes[1]===0x4b?'xlsx':bytes[0]===0xd0&&bytes[1]===0xcf?'xls':null;
      if(!format)throw Error('Response is not an Excel workbook');
      const path=`workbooks/${source.id}-${sha256.slice(0,16)}.${format}`;await writeFile(`${directory}/${path}`,bytes);
      Object.assign(source,{sha256,path:'data/'+path,format,supported:true,size:bytes.length,checkedAt,changedAt:old?.sha256===sha256?old.changedAt:checkedAt,etag:headers.get('etag'),lastModified:headers.get('last-modified'),status:'ok'});
    }catch(e){
      if(!old)throw Error(`${source.label}: ${e.message}`);
      Object.assign(source,{...old,url:source.url,status:'error',error:e.message,attemptedAt:checkedAt});
    }
  }
  if(sources.every(s=>s.status!=='ok'))throw Error('All workbook checks failed; keeping previous catalog');
  const catalog={schemaVersion:1,catalogUrl:CATALOG_URL,checkedAt,method,sources};
  await writeFile(`${directory}/catalog.json`,JSON.stringify(catalog,null,2)+'\n');
  return catalog;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const result=await refreshCatalog();console.log(JSON.stringify({checkedAt:result.checkedAt,method:result.method,sources:result.sources.map(s=>({label:s.label,format:s.format,hash:s.sha256,status:s.status}))},null,2));
}
